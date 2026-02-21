import TaxonomyControl from "../../models/admin/TaxonomyControl.js";

export const getStoreMetadata = async (req, res) => {
  try {
    const data = await TaxonomyControl.find({ 
      taxonomy: { $in: ["Filter", "Categories"] } 
    }).select("-subject -description"); 

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching metadata", error: error.message });
  }
};

export const getActiveEvent = async (req, res) => {
  try {
    const event = await TaxonomyControl.findOne({ taxonomy: "Event" })
      .select("subject description taxonomy _id");

    if (!event) return res.status(404).json({ message: "No active event found" });
    
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: "Error fetching event", error: error.message });
  }
};

export const updateTaxonomy = async (req, res) => {
  try {
    const { id, ...updateData } = req.body; 
    const updatedDoc = await TaxonomyControl.findByIdAndUpdate(
      id, 
      { $set: updateData }, 
      { new: true, runValidators: true }
    );

    if (!updatedDoc) return res.status(404).json({ message: "Item not found" });

    res.status(200).json({ data: updatedDoc });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};