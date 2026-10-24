import express from "express"
import dotenv from "dotenv"
import { GoogleGenAI } from "@google/genai";

dotenv.config()

const app = express()

const PORT = process.env.PORT || 5000

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.json())

async function main() {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: "Explain how AI works in a few words",
      });

    console.log(response.text);

    // Stream response ------
    // const responseStream = await ai.models.generateContentStream({
    //     model: "gemini-3.8-flash",
    //     contents: "Explain how AI works in a few words",
    // })

    // for await (const chunk of responseStream) {
    //     process.stdout.write(chunk.text);
    // }

}

// main();

app.post("/chat", (req, res) => {
    const {prompt } = req.body;

    const result = await ai.models.generateContent({
        model : ""
    })
})

app.listen(PORT, () => console.log("Server started at " + PORT))