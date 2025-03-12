import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Aura-care API",
            version: "1.0.0",
            description: "This documentation contains all defined endpoints for Aura-care, including authentication via Supabase.",
        },
        servers: [
            {
                url: "http://localhost:8040/api/v1",
                description: "Development server",
            },
            {
                url: "https://aura-care.onrender.com/api/v1",
                description: "Production server",
            },
            {
                url: "http://localhost:8040",
                description: "Development Base url"
            },
            {
                url: "https://aura-care.onrender.com",
                description: "Production server base url",
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Use the Supabase-provided JWT for authentication.",
                },
            },
        },
        security: [{ BearerAuth: [] }], // Apply BearerAuth globally
    },
    apis: ["./routes/*.ts", "./routes/*.js"],
};


const swaggerSpec = swaggerJSDoc(options);

const swaggerDocs = (app: Express): void => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log("✅ Swagger docs available at: http://localhost:8040/api-docs");
};

export default swaggerDocs;