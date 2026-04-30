const MAX_POKEMON = 10000;
const listWrapper = document.querySelector(".list-wrapper");
const searchInput = document.querySelector("#search-input");
const numberFilter = document.querySelector("#number");
const nameFilter = document.querySelector("#name");
const abilityFilter = document.querySelector("#ability");
const notFoundMessage = document.querySelector("#not-found-message");
const filterWrapper = document.querySelector(".filter-wrapper");

let allPokemons = [];
let allAbilities = {};
let abilityDropdown = null;
let favorites = JSON.parse(localStorage.getItem("pokemonFavorites")) || [];

function saveFavorites() {
  localStorage.setItem("pokemonFavorites", JSON.stringify(favorites));
}

function toggleFavorite(pokemonName, heartElement) {
  const index = favorites.indexOf(pokemonName);
  if (index > -1) {
    favorites.splice(index, 1);
    heartElement.textContent = "🤍";
  } else {
    favorites.push(pokemonName);
    heartElement.textContent = "❤️";
  }
  saveFavorites();
}

async function fetchAllPokemonWithAbilities() {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${MAX_POKEMON}`);
    const data = await response.json();
    allPokemons = data.results;
    
    const abilitiesMap = {};
    const fetchPromises = [];
    const fetchLimit = Math.min(200, allPokemons.length);
    
    for (let i = 0; i < fetchLimit; i++) {
      const pokemonID = allPokemons[i].url.split("/")[6];
      fetchPromises.push(
        fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonID}`)
          .then(res => res.json())
          .then(pokemonData => {
            pokemonData.abilities.forEach(({ ability }) => {
              const abilityName = ability.name;
              if (!abilitiesMap[abilityName]) {
                abilitiesMap[abilityName] = [];
              }
              abilitiesMap[abilityName].push(pokemonData.name);
            });
          })
          .catch(err => console.error("Error fetching Pokemon:", err))
      );
    }
    
    await Promise.all(fetchPromises);
    allAbilities = abilitiesMap;
    createAbilityDropdown();
    displayPokemons(allPokemons);
  } catch (error) {
    console.error("Error fetching Pokemon list:", error);
  }
}

function createAbilityDropdown() {
  if (!filterWrapper) return;
  

  if (document.querySelector("#ability-dropdown")) return;
  
  abilityDropdown = document.createElement("div");
  abilityDropdown.id = "ability-dropdown";
  abilityDropdown.style.display = "none";
  abilityDropdown.innerHTML = `
    <select class="body3-fonts" style="width: 100%; padding: 8px; margin-top: 8px; border-radius: 8px; border: 1px solid #ccc;">
      <option value="">Select Ability</option>
      ${Object.keys(allAbilities).sort().map(ability => 
        `<option value="${ability}">${ability}</option>`
      ).join('')}
    </select>
  `;
  filterWrapper.appendChild(abilityDropdown);
  

  const selectElement = abilityDropdown.querySelector("select");
  selectElement.addEventListener("change", handleAbilityFilter);
}

function handleAbilityFilter(event) {
  const selectedAbility = event.target.value;
  if (!selectedAbility) {
    displayPokemons(allPokemons);
    notFoundMessage.style.display = "none";
    return;
  }
  
  const filteredPokemons = allPokemons.filter(pokemon => 
    allAbilities[selectedAbility] && allAbilities[selectedAbility].includes(pokemon.name)
  );
  
  displayPokemons(filteredPokemons);
  
  if (filteredPokemons.length === 0) {
    notFoundMessage.style.display = "block";
  } else {
    notFoundMessage.style.display = "none";
  }
}

fetchAllPokemonWithAbilities();

async function fetchPokemonDataBeforeRedirect(id) {
  try {
    const [pokemon, pokemonSpecies] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then((res) =>
        res.json()
      ),
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then((res) =>
        res.json()
      ),
    ]);
    return true;
  } catch (error) {
    console.error("Failed to fetch Pokemon data before redirect");
  }
}

function displayPokemons(pokemon) {
  listWrapper.innerHTML = "";

  pokemon.forEach((pokemon) => {
    const pokemonID = pokemon.url.split("/")[6];
    const pokemonName = pokemon.name;
    const isFavorite = favorites.includes(pokemonName);
    const heartSymbol = isFavorite ? "❤️" : "🤍";
    
    const listItem = document.createElement("div");
    listItem.className = "list-item";
    listItem.innerHTML = `
        <div class="number-wrap">
            <p class="caption-fonts">#${pokemonID}</p>
            <button class="heart-btn" style="background:none;border:none;cursor:pointer;font-size:16px;">${heartSymbol}</button>
        </div>
        <div class="img-wrap">
            <img src="https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/other/dream-world/${pokemonID}.svg" alt="${pokemon.name}" />
        </div>
        <div class="name-wrap">
            <p class="body3-fonts">${pokemon.name}</p>
        </div>
    `;

    
    const heartBtn = listItem.querySelector(".heart-btn");
    heartBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(pokemonName, heartBtn);
    });

    // Handle card click
    listItem.addEventListener("click", async () => {
      const success = await fetchPokemonDataBeforeRedirect(pokemonID);
      if (success) {
        window.location.href = `./detail.html?id=${pokemonID}`;
      }
    });

    listWrapper.appendChild(listItem);
  });
}

searchInput.addEventListener("keyup", handleSearch);


numberFilter.addEventListener("change", handleFilterChange);
nameFilter.addEventListener("change", handleFilterChange);
abilityFilter.addEventListener("change", handleFilterChange);

function handleFilterChange() {
  if (abilityFilter.checked) {
    searchInput.style.display = "none";
    if (abilityDropdown) {
      abilityDropdown.style.display = "block";
    }
    searchInput.value = "";
    displayPokemons(allPokemons);
    notFoundMessage.style.display = "none";
  } else {
    searchInput.style.display = "block";
    if (abilityDropdown) {
      abilityDropdown.style.display = "none";
    }

    const selectElement = abilityDropdown?.querySelector("select");
    if (selectElement) {
      selectElement.value = "";
    }
  }
}

function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  let filteredPokemons;

  if (numberFilter.checked) {
    filteredPokemons = allPokemons.filter((pokemon) => {
      const pokemonID = pokemon.url.split("/")[6];
      return pokemonID.startsWith(searchTerm);
    });
  } else if (nameFilter.checked) {
    filteredPokemons = allPokemons.filter((pokemon) =>
      pokemon.name.toLowerCase().startsWith(searchTerm)
    );
  } else {
    filteredPokemons = allPokemons;
  }

  displayPokemons(filteredPokemons);

  if (filteredPokemons.length === 0) {
    notFoundMessage.style.display = "block";
  } else {
    notFoundMessage.style.display = "none";
  }
}

const closeButton = document.querySelector(".search-close-icon");
closeButton.addEventListener("click", clearSearch);

function clearSearch() {
  searchInput.value = "";
  displayPokemons(allPokemons);
  notFoundMessage.style.display = "none";
}
