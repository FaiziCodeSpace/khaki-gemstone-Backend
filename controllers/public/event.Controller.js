import Event from "../../models/public/Event.js";

export const addEvent = async (req, res) => {
  try {
    const { subject, description } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ message: "Subject and Description are required" });
    }

    // 1. Delete all existing events first
    await Event.deleteMany({});

    // 2. Create the new "Current" event
    const newEvent = new Event({
      subject,
      description,
    });

    await newEvent.save();

    res.status(201).json({
      message: "New event announced and previous ones cleared!",
      event: newEvent,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating event", error: error.message });
  }
};

export const getLatestEvent = async (req, res) => {
  try {
    // findOne() gets the only document in the collection
    const event = await Event.findOne();
    
    if (!event) {
      return res.status(404).json({ message: "No active announcements" });
    }

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: "Error fetching event", error: error.message });
  }
};