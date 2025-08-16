const countryStateCity = require('country-state-city');

exports.getStates = async (req, res) => {
  try {
    const { country } = req.query;
    
    if (!country) {
      return res.status(400).json({ message: 'Country code is required' });
    }

    // Get states using country-state-city package
    const states = countryStateCity.State.getStatesOfCountry(country);
    
    res.json(states);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ message: 'Error fetching states' });
  }
};