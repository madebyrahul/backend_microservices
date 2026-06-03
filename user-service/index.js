import express from "express"
import bodyParser from "body-parser"
import mongoose from "mongoose"

const app = express()
app.use(bodyParser.json())

mongoose
 .connect("mongodb://mongo:27017/users")
 .then(()=> console.log("mongodb connected"))
 .catch(err => console.error("mongodb connection error:", err))

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
})

const User = mongoose.model("User", UserSchema)

app.get("/", async(req,res)=>{
    res.send("User service is running")
})

app.post("/users", async(req,res)=>{
    const { name, email } = req.body
    try {
        const user = new User({ name, email })
        await user.save()
        res.status(201).json(user)
    } catch (error) {
        console.error("Error saving user:", error)
        res.status(500).json({error: "Failed to create user"})
    }
})

app.get("/users",async(req,res)=>{
    const users = await User.find()
    res.json(users)
})

const port = 3001

app.listen(port, ()=>{
    console.log(`User service is running on port ${port}`)
})