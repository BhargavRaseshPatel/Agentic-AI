import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { ChatGoogle } from "@langchain/google";
import { ChatGroq } from "@langchain/groq"

dotenv.config()

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

// langchain


app.post("/chat", async (req, res) => {
    // console.log("yes")
    const { prompt } = req.body;

    const model = new ChatGroq({"model":"openai/gpt-oss-120b"});
    // const result = await model.invoke(prompt)

    const result = await model.invoke([
        {
            role : "system",
            content : "you are jarvis and my assistant"
        },{
            role: "human",
            content : prompt
        }
        ])


    return res.json(result.content)

})

app.get("/", (req, res) => {
    res.status(200).json({
        message: "GET request successful"
    });
});

app.listen(PORT, () => console.log("Server started at " + PORT))