// Variables globales
let player;
let currentVideoId = '';
let playlist = [];
let currentPlaylistIndex = -1;
let searchResults = [];

// Cargar la API de YouTube
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '500',
        width: '100%',
        playerVars: {
            'autoplay': 1,
            'controls': 1,
            'rel': 0,
            'showinfo': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// Cuando el reproductor está listo
function onPlayerReady(event) {
    console.log('Reproductor listo');
    // Cargar playlist desde localStorage si existe
    loadPlaylistFromStorage();
}

// Cambios en el estado del reproductor
function onPlayerStateChange(event) {
    // Cuando el video termina, reproducir el siguiente en la playlist
    if (event.data === YT.PlayerState.ENDED && playlist.length > 0) {
        playNextVideo();
    }
}

// Buscar videos
function searchVideos() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();
    
    if (query === '') return;
    
    // Usar la API de YouTube Data v3 (necesitarás una clave API)
    // Nota: En una aplicación real, esto debería hacerse desde el backend por seguridad
    const API_KEY = 'AIzaSyBSMTFseDyvuoFckww1F28qBPHR9tqt_GA'; // Reemplaza con tu API key
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            searchResults = data.items;
            displaySearchResults(searchResults);
        })
        .catch(error => {
            console.error('Error al buscar videos:', error);
            alert('Error al buscar videos. Por favor intenta nuevamente.');
        });
}

// Mostrar resultados de búsqueda
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p>No se encontraron resultados.</p>';
        return;
    }
    
    results.forEach((item, index) => {
        const videoId = item.id.videoId;
        const thumbnail = item.snippet.thumbnails.medium.url;
        const title = item.snippet.title;
        const channel = item.snippet.channelTitle;
        
        const resultElement = document.createElement('div');
        resultElement.className = 'search-result';
        resultElement.innerHTML = `
            <img src="${thumbnail}" alt="${title}">
            <div class="search-result-info">
                <div class="search-result-title">${title}</div>
                <div class="search-result-channel">${channel}</div>
            </div>
        `;
        
        resultElement.addEventListener('click', () => {
            playVideo(videoId);
        });
        
        resultsContainer.appendChild(resultElement);
    });
}

// Reproducir un video
function playVideo(videoId) {
    if (!player) return;
    
    currentVideoId = videoId;
    player.loadVideoById(videoId);
    
    // Resaltar el video actual en la playlist si está allí
    highlightCurrentVideoInPlaylist(videoId);
}

// Añadir video a la playlist
function addToPlaylist(videoId, title, thumbnail) {
    // Verificar si el video ya está en la playlist
    if (playlist.some(item => item.id === videoId)) {
        alert('Este video ya está en la playlist.');
        return;
    }
    
    playlist.push({
        id: videoId,
        title: title,
        thumbnail: thumbnail
    });
    
    updatePlaylistDisplay();
    savePlaylistToStorage();
    
    // Si es el primer video de la playlist, reproducirlo
    if (playlist.length === 1) {
        playVideo(videoId);
        currentPlaylistIndex = 0;
    }
}

// Actualizar la visualización de la playlist
function updatePlaylistDisplay() {
    const playlistElement = document.getElementById('playlist');
    playlistElement.innerHTML = '';
    
    playlist.forEach((item, index) => {
        const li = document.createElement('li');
        if (item.id === currentVideoId) {
            li.classList.add('active');
        }
        
        li.innerHTML = `
            <span>${index + 1}. ${item.title}</span>
            <button class="remove-btn" data-index="${index}"><i class="fas fa-times"></i></button>
        `;
        
        li.addEventListener('click', () => {
            playVideo(item.id);
            currentPlaylistIndex = index;
        });
        
        playlistElement.appendChild(li);
    });
    
    // Agregar eventos a los botones de eliminar
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            removeFromPlaylist(index);
        });
    });
}

// Eliminar video de la playlist
function removeFromPlaylist(index) {
    if (index >= 0 && index < playlist.length) {
        // Si estamos eliminando el video actual, reproducir el siguiente si existe
        if (playlist[index].id === currentVideoId) {
            playlist.splice(index, 1);
            if (playlist.length > 0) {
                const newIndex = index < playlist.length ? index : 0;
                playVideo(playlist[newIndex].id);
                currentPlaylistIndex = newIndex;
            } else {
                currentVideoId = '';
                currentPlaylistIndex = -1;
                player.stopVideo();
            }
        } else {
            playlist.splice(index, 1);
            // Ajustar el índice actual si es necesario
            if (currentPlaylistIndex > index) {
                currentPlaylistIndex--;
            }
        }
        
        updatePlaylistDisplay();
        savePlaylistToStorage();
    }
}

// Reproducir siguiente video en la playlist
function playNextVideo() {
    if (playlist.length === 0) return;
    
    currentPlaylistIndex = (currentPlaylistIndex + 1) % playlist.length;
    playVideo(playlist[currentPlaylistIndex].id);
}

// Resaltar video actual en la playlist
function highlightCurrentVideoInPlaylist(videoId) {
    const playlistItems = document.querySelectorAll('#playlist li');
    playlistItems.forEach(item => {
        item.classList.remove('active');
    });
    
    playlist.forEach((item, index) => {
        if (item.id === videoId) {
            currentPlaylistIndex = index;
            if (playlistItems[index]) {
                playlistItems[index].classList.add('active');
            }
        }
    });
}

// Guardar playlist en localStorage
function savePlaylistToStorage() {
    localStorage.setItem('youtubePlaylist', JSON.stringify(playlist));
    localStorage.setItem('youtubeCurrentVideo', currentVideoId);
    localStorage.setItem('youtubeCurrentIndex', currentPlaylistIndex.toString());
}

// Cargar playlist desde localStorage
function loadPlaylistFromStorage() {
    const savedPlaylist = localStorage.getItem('youtubePlaylist');
    const savedVideo = localStorage.getItem('youtubeCurrentVideo');
    const savedIndex = localStorage.getItem('youtubeCurrentIndex');
    
    if (savedPlaylist) {
        playlist = JSON.parse(savedPlaylist);
        updatePlaylistDisplay();
    }
    
    if (savedVideo && savedVideo !== '') {
        currentVideoId = savedVideo;
        currentPlaylistIndex = savedIndex ? parseInt(savedIndex) : -1;
        playVideo(currentVideoId);
    }
}

// Búsqueda por voz
function startVoiceSearch() {
    const voiceStatus = document.getElementById('voice-status');
    voiceStatus.style.display = 'block';
    
    // Verificar si el navegador soporta reconocimiento de voz
    if (!('webkitSpeechRecognition' in window)) {
        alert('Tu navegador no soporta reconocimiento de voz. Prueba con Chrome.');
        voiceStatus.style.display = 'none';
        return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    
    recognition.onstart = function() {
        console.log('Escuchando...');
    };
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('search-input').value = transcript;
        voiceStatus.style.display = 'none';
        searchVideos();
    };
    
    recognition.onerror = function(event) {
        console.error('Error en reconocimiento de voz:', event.error);
        voiceStatus.style.display = 'none';
        alert('Error en reconocimiento de voz: ' + event.error);
    };
    
    recognition.onend = function() {
        voiceStatus.style.display = 'none';
    };
    
    recognition.start();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Buscar al hacer clic en el botón
    document.getElementById('search-btn').addEventListener('click', searchVideos);
    
    // Buscar al presionar Enter
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchVideos();
        }
    });
    
    // Búsqueda por voz
    document.getElementById('voice-btn').addEventListener('click', startVoiceSearch);
    
    // Añadir video actual a la playlist
    document.getElementById('add-playlist-btn').addEventListener('click', function() {
        if (!currentVideoId) {
            alert('No hay ningún video reproduciéndose.');
            return;
        }
        
        // Buscar el título y thumbnail del video actual en los resultados de búsqueda
        const currentVideo = searchResults.find(item => item.id.videoId === currentVideoId);
        if (currentVideo) {
            addToPlaylist(
                currentVideoId,
                currentVideo.snippet.title,
                currentVideo.snippet.thumbnails.medium.url
            );
        } else {
            // Si no está en los resultados, usar datos básicos
            addToPlaylist(currentVideoId, `Video ID: ${currentVideoId}`, '');
        }
    });
    
    // Limpiar playlist
    document.getElementById('clear-playlist-btn').addEventListener('click', function() {
        if (confirm('¿Estás seguro de que quieres limpiar toda la playlist?')) {
            playlist = [];
            currentVideoId = '';
            currentPlaylistIndex = -1;
            updatePlaylistDisplay();
            savePlaylistToStorage();
            player.stopVideo();
        }
    });
});

//================ Dark - Mode ======================
function myFunction() {
   var element = document.body;
   element.classList.toggle("dark-mode");
}
