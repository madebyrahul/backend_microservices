import express from "express"
import bodyParser from "body-parser"
import amqp from "amqplib"

const app = express()
app.use(bodyParser.json())

let channel,connection
async function consumeRabbitMQWithRetry(retries = 5, delay = 3000){
     while(retries){
        try {
            connection = await amqp.connect("amqp://rabbitmq")
            channel = await connection.createChannel()
            await channel.assertQueue("task_created", {durable: true})
            console.log("Consumer RabbitMQ connected")
            channel.consume("task_created", (msg) => {
                const taskData = JSON.parse(msg.content.toString())
                console.log("Received task created message:", taskData)
                channel.ack(msg)
            })
            return
        } catch (error) {
            console.error("RabbitMQ connection error:", error)
            channel.nack(msg)
            retries --
            console.log("Retrying RabbitMQ connection ", retries)
            await new Promise(res => setTimeout(res,delay))
        }
     }
}




const port = 3003
app.listen(port, ()=>{
    console.log(`Notification service is running on port ${port}`)
    consumeRabbitMQWithRetry()
})