// TMDB API Configuration
const API_KEY = 'f5a23327eb2c615af3a7e52dab31862b';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentPage = 1;
let currentSearch = '';
let totalPages = 1;
let trendingMovies = [];
let genreList = {};
let currentCarouselIndex = 0;
let carouselAutoplay;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const noResults = document.getElementById('noResults');
const loading = document.getElementById('loading');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const modal = document.getElementById('movieModal');
const closeBtn = document.querySelector('.close');
const modalBody = document.getElementById('modalBody');
const genreFilter = document.getElementById('genreFilter');
const yearFilter = document.getElementById('yearFilter');
const heroCarousel = document.getElementById('heroCarousel');
const carouselControls = document.getElementById('carouselControls');
const watchBtn = document.querySelector('.watch-btn');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
genreFilter.addEventListener('change', applyFilters);
yearFilter.addEventListener('change', applyFilters);
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        scrollToTop();
        if (currentSearch) {
            searchMovies();
        } else {
            loadTrendingMovies();
        }
    }
});
nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        scrollToTop();
        if (currentSearch) {
            searchMovies();
        } else {
            loadTrendingMovies();
        }
    }
});
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
watchBtn.addEventListener('click', () => {
    document.getElementById('films').scrollIntoView({ behavior: 'smooth' });
});

async function loadGenres() {
    try {
        const response = await fetch(
            `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=ru-RU`
        );
        const data = await response.json();
        if (data.genres) {
            data.genres.forEach(genre => {
                genreList[genre.id] = genre.name;
                const option = document.createElement('option');
                option.value = genre.id;
                option.textContent = genre.name;
                genreFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Genre loading error:', error);
    }
}

function loadYears() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1950; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    }
}

async function applyFilters() {
    const selectedGenre = genreFilter.value;
    const selectedYear = yearFilter.value;

    currentPage = 1;
    showLoading();

    try {
        let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&page=${currentPage}&sort_by=popularity.desc`;
        
        if (selectedGenre) {
            url += `&with_genres=${selectedGenre}`;
        }
        if (selectedYear) {
            url += `&primary_release_year=${selectedYear}`;
        }

        url += `&language=ru-RU`;

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            displayMovies(data.results);
            totalPages = Math.min(data.total_pages, 500);
            updatePagination();
            noResults.style.display = 'none';
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Filter error:', error);
        showError('Filter error. Try again.');
    } finally {
        hideLoading();
    }
}

async function loadCarousel() {
    try {
        const response = await fetch(
            `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=ru-RU`
        );
        const data = await response.json();
        if (data.results) {
            trendingMovies = data.results.slice(0, 3);
            displayCarousel();
        }
    } catch (error) {
        console.error('Carousel load error:', error);
    }
}

function displayCarousel() {
    heroCarousel.innerHTML = '';
    carouselControls.innerHTML = '';
    currentCarouselIndex = 0;
    
    trendingMovies.forEach((movie, index) => {
        const item = document.createElement('div');
        item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        const poster = movie.poster_path 
            ? `${IMAGE_BASE_URL}${movie.poster_path}`
            : 'https://via.placeholder.com/800x400?text=No+Image';
        
        item.innerHTML = `<img src="${poster}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/800x400?text=No+Image'">`;
        item.addEventListener('click', () => showMovieDetails(movie));
        heroCarousel.appendChild(item);
        
        const dot = document.createElement('div');
        dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            showCarouselSlide(index);
        });
        carouselControls.appendChild(dot);
    });
    
    startCarouselAutoplay();
}

function showCarouselSlide(index) {
    currentCarouselIndex = index;
    const items = document.querySelectorAll('.carousel-item');
    const dots = document.querySelectorAll('.carousel-dot');
    
    items.forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    clearInterval(carouselAutoplay);
    startCarouselAutoplay();
}

function startCarouselAutoplay() {
    carouselAutoplay = setInterval(() => {
        currentCarouselIndex = (currentCarouselIndex + 1) % trendingMovies.length;
        showCarouselSlide(currentCarouselIndex);
    }, 5000);
}


function handleSearch() {
    currentSearch = searchInput.value.trim();
    if (!currentSearch) {
        currentSearch = '';
        currentPage = 1;
        loadTrendingMovies();
        return;
    }
    currentPage = 1;
    searchMovies();
}

async function searchMovies() {
    if (!API_KEY) {
        showError('Error: API key not set!');
        return;
    }

    showLoading();
    try {
        const response = await fetch(
            `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(currentSearch)}&page=${currentPage}&language=ru-RU`
        );
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            displayMovies(data.results);
            totalPages = Math.min(data.total_pages, 500);
            updatePagination();
            noResults.style.display = 'none';
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Search error:', error);
        showError('Search error: ' + error.message);
    } finally {
        hideLoading();
    }
}


async function loadTrendingMovies() {
    if (!API_KEY) {
        showError('Error: API key not set!');
        return;
    }

    showLoading();
    try {
        const response = await fetch(
            `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${currentPage}&language=ru-RU`
        );
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            displayMovies(data.results);
            totalPages = Math.min(data.total_pages, 500);
            updatePagination();
            noResults.style.display = 'none';
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Load error:', error);
        showError('Error loading movies. Check API key.');
    } finally {
        hideLoading();
    }
}


function displayMovies(movies) {
    resultsContainer.innerHTML = '';
    
    movies.forEach(movie => {
        const card = createMovieCard(movie);
        resultsContainer.appendChild(card);
    });
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const posterUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}`
        : 'https://via.placeholder.com/200x300?text=No+Poster';
    
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

    card.innerHTML = `
        <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/200x300?text=No+Poster'">
        <div class="movie-info">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-year">${year}</div>
            <div class="movie-rating">
                <span class="star">⭐</span>
                <span class="rating-value">${rating}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => showMovieDetails(movie));
    return card;
}


async function showMovieDetails(movie) {
    if (!API_KEY) {
        alert('Error: API key not set!');
        return;
    }

    try {
        const response = await fetch(
            `${BASE_URL}/movie/${movie.id}?api_key=${API_KEY}&language=ru-RU`
        );
        const details = await response.json();
        
        const posterUrl = details.poster_path 
            ? `${IMAGE_BASE_URL}${details.poster_path}`
            : 'https://via.placeholder.com/300x450?text=No+Poster';
        
        const year = details.release_date ? new Date(details.release_date).getFullYear() : 'N/A';
        const budget = details.budget > 0 ? `$${(details.budget / 1000000).toFixed(0)}M` : 'N/A';
        const revenue = details.revenue > 0 ? `$${(details.revenue / 1000000).toFixed(0)}M` : 'N/A';
        const runtime = details.runtime > 0 ? `${details.runtime} min` : 'N/A';
        const genres = details.genres.map(g => g.name).join(', ') || 'N/A';
        const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';

        modalBody.innerHTML = `
            <img src="${posterUrl}" alt="${details.title}" class="modal-poster" onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'">
            <h2 class="modal-title">${details.title}</h2>
            <div class="modal-year">${year}</div>
            <div class="modal-rating">
                <span class="star">⭐</span>
                <span class="rating-value">${rating} / 10</span>
                <span style="color: #999;">(${details.vote_count} votes)</span>
            </div>
            <div class="modal-overview">
                <strong>Description:</strong><br>
                ${details.overview || 'No description'}
            </div>
            <div class="modal-details">
                <div class="detail-item">
                    <span class="detail-label">Genres</span>
                    <span class="detail-value">${genres}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Runtime</span>
                    <span class="detail-value">${runtime}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">${details.status}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Language</span>
                    <span class="detail-value">${details.original_language.toUpperCase()}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Budget</span>
                    <span class="detail-value">${budget}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Revenue</span>
                    <span class="detail-value">${revenue}</span>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        alert('Error loading movie details: ' + error.message);
    }
}

function closeModal() {
    modal.classList.remove('active');
}

function updatePagination() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function showLoading() {
    loading.classList.add('active');
    resultsContainer.innerHTML = '';
    noResults.style.display = 'none';
}

function hideLoading() {
    loading.classList.remove('active');
}

function showNoResults() {
    resultsContainer.innerHTML = '';
    noResults.style.display = 'block';
}

function showError(message) {
    resultsContainer.innerHTML = '';
    noResults.innerHTML = `<p style="color: #ff6b6b;">${message}</p>`;
    noResults.style.display = 'block';
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('DOMContentLoaded', () => {
    loadGenres();
    loadYears();
    loadCarousel();
    loadTrendingMovies();
});
