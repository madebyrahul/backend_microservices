import express from "express"
import bodyParser from "body-parser"
import mongoose from "mongoose"
import amqp from "amqplib"

const app = express()
app.use(bodyParser.json())

mongoose
 .connect("mongodb://mongo:27017/tasks")
 .then(()=> console.log("mongodb connected"))
 .catch(err => console.error("mongodb connection error:", err))

const TaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    userId: String,
},{
    timestamps:true,
})

const Task = mongoose.model("Task", TaskSchema)

let channel,connection
async function connectRabbitMQWithRetry(retries = 5, delay = 3000){
     while(retries){
        try {
            connection = await amqp.connect("amqp://rabbitmq")
            channel = await connection.createChannel()
            await channel.assertQueue("task_created", {durable: true})
            console.log("RabbitMQ connected")
            return
        } catch (error) {
            console.error("RabbitMQ connection error:", error)
            retries --
            console.log("Retrying RabbitMQ connection ", retries)
            await new Promise(res => setTimeout(res,delay))
        }
     }
}

app.post("/tasks", async(req,res)=>{
    const { title, description,userId } = req.body
    try {
        const task = new Task({ title, description,userId })
        await task.save()

        const message = {
            taskId: task._id,
            userId,
            title
        }

        if(!channel) return res.status(503).json({error: "RabbitMQ not connected"})
        
        channel.sendToQueue("task_created", Buffer.from(JSON.stringify(message)), {persistent: true})

        res.status(201).json(task)
    } catch (error) {
        console.error("Error saving task:", error)
        res.status(500).json({error: "Failed to create task"})
    }
})

app.get("/tasks",async(req,res)=>{
    const tasks = await Task.find()
    res.json(tasks)
})

app.get("/", async(req,res)=>{
    res.send("Task service is running")
})

const port = 3002

app.listen(port, ()=>{
    console.log(`Task service is running on port ${port}`)
    connectRabbitMQWithRetry()
})