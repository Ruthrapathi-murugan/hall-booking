import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB URIs
const atlasUri = process.env.MONGODB_URI;
const localUri = process.env.MONGODB_LOCAL_URI;

// Log URIs for debugging
console.log('Atlas URI:', atlasUri);
console.log('Local URI:', localUri);

// Initialize MongoDB clients
const atlasClient = new MongoClient(atlasUri);
const localClient = new MongoClient(localUri);

let roomsCollection;
let bookingsCollection;

// Connect to MongoDB and initialize collections
async function connectToMongoDB() {
    try {
        // Connect to Atlas
        await atlasClient.connect();
        console.log('Connected to MongoDB Atlas');
        const atlasDb = atlasClient.db('hallBookingDB');
        roomsCollection = atlasDb.collection('rooms');
        bookingsCollection = atlasDb.collection('bookings');

        // Optionally connect to Local MongoDB
        await localClient.connect();
        console.log('Connected to Local MongoDB');
        // You can initialize local collections here if needed

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

connectToMongoDB();

app.use(express.json());

// 1. Create a Room
app.post('/rooms', async (req, res) => {
    const { roomName, seats, amenities, pricePerHour } = req.body;
    if (!roomName || !seats || !amenities || !pricePerHour) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const newRoom = { roomName, seats, amenities, pricePerHour };
    const result = await roomsCollection.insertOne(newRoom);
    res.status(201).json({ message: 'Room created successfully', roomID: result.insertedId });
});

// 2. Booking a Room
app.post('/bookings', async (req, res) => {
    const { customerName, dateStart, dateEnd, roomID } = req.body;
    if (!customerName || !dateStart || !dateEnd || !roomID) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const room = await roomsCollection.findOne({ _id: new ObjectId(roomID) });
    if (!room) {
        return res.status(404).json({ message: 'Room not found' });
    }

    // Check if the room is already booked in the given time range
    const isBooked = await bookingsCollection.findOne({
        roomID: new ObjectId(roomID),
        $or: [
            { dateStart: { $lt: new Date(dateEnd) }, dateEnd: { $gt: new Date(dateStart) } }
        ]
    });

    if (isBooked) {
        return res.status(400).json({ message: 'Room is already booked for the given time range' });
    }

    const newBooking = { customerName, dateStart: new Date(dateStart), dateEnd: new Date(dateEnd), roomID: new ObjectId(roomID), status: 'Booked' };
    const result = await bookingsCollection.insertOne(newBooking);
    res.status(201).json({ message: 'Room booked successfully', bookingID: result.insertedId });
});

// 3. List all Rooms with Booking Status
app.get('/rooms', async (req, res) => {
    const rooms = await roomsCollection.find().toArray();
    const bookings = await bookingsCollection.find().toArray();

    const roomsWithBookings = rooms.map(room => {
        const roomBookings = bookings.filter(booking => booking.roomID.equals(room._id));
        return { ...room, bookings: roomBookings };
    });

    res.status(200).json(roomsWithBookings);
});

// 4. List all Customers with Booked Halls
app.get('/customers', async (req, res) => {
    const bookings = await bookingsCollection.find().toArray();
    const rooms = await roomsCollection.find().toArray();

    const customers = bookings.map(booking => ({
        customerName: booking.customerName,
        roomName: rooms.find(room => room._id.equals(booking.roomID)).roomName,
        dateStart: booking.dateStart,
        dateEnd: booking.dateEnd
    }));

    res.status(200).json(customers);
});

// 5. List how many times a customer has booked a room
app.get('/customer-bookings/:customerName', async (req, res) => {
    const customerName = req.params.customerName;
    const customerBookings = await bookingsCollection.find({ customerName }).toArray();

    const detailedBookings = customerBookings.map(booking => ({
        roomName: rooms.find(room => room._id.equals(booking.roomID)).roomName,
        dateStart: booking.dateStart,
        dateEnd: booking.dateEnd,
        bookingID: booking._id,
        status: booking.status
    }));

    res.status(200).json(detailedBookings);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
