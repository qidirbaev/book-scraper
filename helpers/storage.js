
const connectToMongoDB = uri => {
    return new Promise((resolve, reject) => {
        try {

            mongoose.connect(process.env.MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useFindAndModify: false,
                useCreateIndex: true
            });
            resolve("Connected to MongoDB");

        } catch (error) {
            reject("Error connecting to MongoDB");
        }
    });
};

export default {
    connectToMongoDB
};
