class AppError extends Error{
    status: string;
    statusCode: number;
    isOperational: boolean;
    constructor(message: string | undefined, statusCode: number){
        super(message)

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'Fail': 'Error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor)
    }
}

export default AppError;