import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { EmbeddingVector } from "./embeddings.types.js";

export class EmbeddingClient {
    private readonly ai: GoogleGenAI;
    private readonly model: string; 

    constructor(){
        // get the gemini api key from the environment variable
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new ApiError(500,"GEMINI_API_KEY is not set in the environment variables.");
        }
        // Initialize the GoogleGenAI client with the API key
        this.ai = new GoogleGenAI({ apiKey });
        this.model = "text-embedding-004";
        


    }


}