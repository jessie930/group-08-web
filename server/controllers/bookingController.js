const BookingModel = require('../models/Booking');
const UserModel = require('../models/User');
const CarModel = require('../models/Car');
const shortid = require('shortid');

// GET all bookings
exports.getAllBookings = async (req, res, next) => {
    try {
        const bookings = await BookingModel.find().populate('car');
        res.json(bookings);
    } catch (error) {
        next(error);
    }
}

// GET specific booking by bookingReference
exports.getBookingByRef = async (req, res, next) => {
    const bookingReference = req.params.booking_reference;

    try {
        const booking = await BookingModel.findOne({ bookingReference: bookingReference }).populate('car');
        if (!booking) {
            return res.status(404).json( {message: 'Booking not found' });
        }
        
        // Create HATEOAS links for booking
        const bookingLinks = {
            ...booking._doc,
            links: {
                self: {
                    href: `http://localhost:3000/api/v1/bookings/${bookingReference}`
                },
                car: {
                    href:`http://localhost:3000/api/v1/bookings/${bookingReference}/car`
                },
                
            }
        };

        res.json(bookingLinks);
    } catch (error) {
        next(error);
    }
}

// GET all bookings by user
exports.getAllBookingsByUser = async (req, res, next) => {
    const userEmail = req.params.user_email;
    try {
        const user = await UserModel.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.bookings) {
            res.json(user.bookings);
        }
        const bookings = [];
        
        for (const bookingId of user.bookings) {
            const booking = await BookingModel.findById(bookingId).populate(['user', 'car']);
            bookings.push(booking);
        }

        res.json(bookings); 
    } catch (error) {
        next(error);
    }
}

// GET specific booking by user email and bookingReference
exports.getBookingByUserAndRef = async (req, res, next) => {
    const userEmail = req.params.user_email;
    const bookingReference = req.params.booking_reference;
    try {
        const user = await UserModel.findOne({ email: userEmail }).populate('bookings');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const booking = user.bookings.find((booking) => booking.bookingReference === bookingReference);
        if (!booking) {
            return res.status(404).json({ message: 'User has no booking with this reference number' });
        }

        // Create HATEOAS links for booking
        const bookingLinks = {
            ...booking._doc,
            links: {
                self: {
                    href: `http://localhost:3000/api/v1/users/${userEmail}/bookings/${bookingReference}`
                },
                car: {
                    href:`http://localhost:3000/api/v1/bookings/${bookingReference}/car`
                },
            }
        };
        
        res.json({ bookingLinks });
    } catch (error) {
        next(error);
    }
}

// POST to create a new booking for a specific user
exports.createBookingForUser = async (req, res, next) => {
    let { bookingReference, userEmail, startDate, endDate, status, content, carRegistration } = req.body;
    
    try {
        // If no bookingReference is provided create one otherwise check if booking with reference already exists
        if (!bookingReference) {
            bookingReference = shortid.generate();
        } else {
            const existingBooking = await BookingModel.findOne({ bookingReference: bookingReference });
            if (existingBooking) {
                return res.status(409).json({ "message": "There's already a booking with this reference no, please choose another one" })
            }
        }
        
        // Change user email to _id
        const existingUser = await UserModel.findOne({ email: userEmail }).exec();
        if (!existingUser) {
            return res.status(404).json({ message: 'User doesn\'t exist' });
        }
        const user = existingUser._id;
        
        // Change car registration to _id
        const existingCar = await CarModel.findOne({ registration: carRegistration }).exec();
        if (!existingCar) {
            return res.status(404).json({ message: 'Car doesn\'t exist' });
        }
        const car = existingCar._id;
        
        
        const newBooking = new BookingModel({
            bookingReference,
            user,
            startDate,
            endDate,
            status,
            content,
            car
        });
        
        await newBooking.save();
        
        existingUser.bookings.push(newBooking._id);
        await existingUser.save();

        const booking = await BookingModel.findById(newBooking._id).populate(['user', 'car']);

        res.status(201).json({ message: 'Booking successful', booking })
    } catch (error) {
        next(error);
    }
}

// Remove all bookings
exports.removeAllBookings = async (req, res, next) => {
    try {
        await BookingModel.deleteMany({});
        res.status(200).json({ message: 'Successfully removed all bookings'});
    } catch (error) {
        next(error);
    }
}

// Remove booking by user and bookingReference
exports.removeBookingByUserAndRef = async (req, res, next) => {
    const userEmail = req.params.user_email;
    const bookingReference = req.params.booking_reference;

    try {
        const user = await UserModel.findOne({ email: userEmail }).populate('bookings');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const booking = user.bookings.find((booking) => booking.bookingReference === bookingReference);
        if (!booking) {
            return res.status(404).json({ message: 'User has no booking with this ID' });
        }

        await booking.deleteOne();

        return res.status(200).json({ message: 'Booking removed successfully'});
    } catch (error) {
        next(error);
    }
}

