document.addEventListener('DOMContentLoaded', function() {
  const countrySelect = document.getElementById('country');
  const stateSelect = document.getElementById('state');

  // Load countries on page load
  fetchCountries();

  // When country changes, load states
  countrySelect.addEventListener('change', function() {
    if (this.value) {
      fetchStates(this.value);
      stateSelect.disabled = false;
    } else {
      stateSelect.innerHTML = '<option value="">Select State</option>';
      stateSelect.disabled = true;
    }
  });

  // Fetch countries from API
  function fetchCountries() {
    fetch('https://restcountries.com/v3.1/all')
      .then(response => response.json())
      .then(countries => {
        countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        countrySelect.innerHTML = '<option value="">Select Country</option>' + 
          countries.map(country => 
            `<option value="${country.cca2}">${country.name.common}</option>`
          ).join('');
      })
      .catch(error => {
        console.error('Error loading countries:', error);
        countrySelect.innerHTML = '<option value="">Error loading countries</option>';
      });
  }

  // Fetch states for selected country
  function fetchStates(countryCode) {
    stateSelect.innerHTML = '<option value="">Loading states...</option>';
    
    // Using a free API for states
    fetch(`https://api.countrystatecity.in/v1/countries/${countryCode}/states`, {
      headers: {
        'X-CSCAPI-KEY': 'API_KEY' // Get free key from countrystatecity.in
      }
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to load states');
        return response.json();
      })
      .then(states => {
        if (states.length > 0) {
          states.sort((a, b) => a.name.localeCompare(b.name));
          stateSelect.innerHTML = '<option value="">Select State</option>' + 
            states.map(state => 
              `<option value="${state.iso2}">${state.name}</option>`
            ).join('');
        } else {
          stateSelect.innerHTML = '<option value="">No states available</option>';
        }
      })
      .catch(error => {
        console.error('Error loading states:', error);
        stateSelect.innerHTML = '<option value="">Error loading states</option>';
      });
  }
});


