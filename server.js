import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Temporary in-memory storage
let rooms = [];
let bookings = [];

// 1. Create a Room
app.post('/rooms', (req, res) => {
    const { roomName, seats, amenities, pricePerHour } = req.body;
    if (!roomName || !seats || !amenities || !pricePerHour) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    const roomID = rooms.length + 1;
    rooms.push({ roomID, roomName, seats, amenities, pricePerHour });
    res.status(201).json({ message: 'Room created successfully', roomID });
});

// 2. Booking a Room
app.post('/bookings', (req, res) => {
    const { customerName, dateStart, dateEnd, roomID } = req.body;
    if (!customerName || !dateStart || !dateEnd || !roomID) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const room = rooms.find(room => room.roomID === roomID);
    if (!room) {
        return res.status(404).json({ message: 'Room not found' });
    }

    // Check if the room is already booked in the given time range
    const isBooked = bookings.some(booking => booking.roomID === roomID &&
        ((new Date(dateStart) < new Date(booking.dateEnd)) && (new Date(dateEnd) > new Date(booking.dateStart))));

    if (isBooked) {
        return res.status(400).json({ message: 'Room is already booked for the given time range' });
    }

    const bookingID = bookings.length + 1;
    const newBooking = { bookingID, customerName, dateStart, dateEnd, roomID, status: 'Booked' };
    bookings.push(newBooking);
    res.status(201).json({ message: 'Room booked successfully', bookingID });
});

// 3. List all Rooms with Booking Status
app.get('/rooms', (req, res) => {
    const roomsWithBookings = rooms.map(room => {
        const roomBookings = bookings.filter(booking => booking.roomID === room.roomID);
        return { ...room, bookings: roomBookings };
    });
    res.status(200).json(roomsWithBookings);
});

// 4. List all Customers with Booked Halls
app.get('/customers', (req, res) => {
    const customers = bookings.map(booking => ({
        customerName: booking.customerName,
        roomName: rooms.find(room => room.roomID === booking.roomID).roomName,
        dateStart: booking.dateStart,
        dateEnd: booking.dateEnd
    }));
    res.status(200).json(customers);
});

// 5. List how many times a customer has booked a room
app.get('/customer-bookings/:customerName', (req, res) => {
    const customerName = req.params.customerName;
    const customerBookings = bookings.filter(booking => booking.customerName === customerName);
    
    const detailedBookings = customerBookings.map(booking => ({
        roomName: rooms.find(room => room.roomID === booking.roomID).roomName,
        dateStart: booking.dateStart,
        dateEnd: booking.dateEnd,
        bookingID: booking.bookingID,
        status: booking.status
    }));
    
    res.status(200).json(detailedBookings);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
