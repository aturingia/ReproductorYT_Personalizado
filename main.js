// Variables globales
let player;
let currentVideoId = '';
let playlist = [];
let currentPlaylistIndex = -1;
let searchResults = [];
let savedPlaylists = JSON.parse(localStorage.getItem('savedPlaylists')) || [];

// Inicializar el reproductor de YouTube
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
    // Cargar la última playlist usada si existe
    loadLastPlaylist();
}

// Manejar cambios de estado del reproductor
function onPlayerStateChange(event) {
    // Cuando el video termina, reproducir el siguiente en la playlist
    if (event.data === YT.PlayerState.ENDED && playlist.length > 0) {
        playNextVideo();
    }
}

// Buscar videos en YouTube
function searchVideos() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();
    
    if (query === '') {
        alert('Por favor ingresa un término de búsqueda');
        return;
    }
    
    // En una aplicación real, esto debería hacerse desde el backend
    const API_KEY = 'AIzaSyBSMTFseDyvuoFckww1F28qBPHR9tqt_GA'; // Reemplaza con tu API key de YouTube Data v3
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=300&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video`;
    
    // Mostrar carga mientras se realiza la búsqueda
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<div class="loading">Buscando videos...</div>';
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            searchResults = data.items;
            displaySearchResults(searchResults);
        })
        .catch(error => {
            console.error('Error al buscar videos:', error);
            resultsContainer.innerHTML = '<div class="error">Error al buscar videos. Por favor intenta nuevamente.</div>';
        });
}

// Mostrar resultados de búsqueda
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No se encontraron resultados.</div>';
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
                <div class="search-result-duration">Duración: --:--</div>
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

// Añadir video actual a la playlist
function addCurrentToPlaylist() {
    if (!currentVideoId) {
        alert('No hay ningún video reproduciéndose');
        return;
    }
    
    // Buscar el video actual en los resultados de búsqueda
    const currentVideo = searchResults.find(item => item.id.videoId === currentVideoId);
    if (currentVideo) {
        addToPlaylist(
            currentVideoId,
            currentVideo.snippet.title,
            currentVideo.snippet.thumbnails.default.url
        );
    } else {
        // Si no está en los resultados, usar datos básicos
        addToPlaylist(currentVideoId, `Video ID: ${currentVideoId}`, '');
    }
}

// Añadir video a la playlist
function addToPlaylist(videoId, title, thumbnail) {
    // Verificar si el video ya está en la playlist
    if (playlist.some(item => item.id === videoId)) {
        alert('Este video ya está en la playlist');
        return;
    }
    
    playlist.push({
        id: videoId,
        title: title,
        thumbnail: thumbnail
    });
    
    updatePlaylistDisplay();
    saveCurrentPlaylist();
    
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
    
    if (playlist.length === 0) {
        playlistElement.innerHTML = '<li class="empty">La playlist está vacía</li>';
        return;
    }
    
    playlist.forEach((item, index) => {
        const li = document.createElement('li');
        if (item.id === currentVideoId) {
            li.classList.add('active');
        }
        
        li.innerHTML = `
            <div class="video-info">
                <img class="video-thumbnail" src="${item.thumbnail}" alt="${item.title}">
                <span class="video-title">${item.title}</span>
            </div>
            <button class="remove-btn" data-index="${index}"><i class="fas fa-times"></i></button>
        `;
        
        li.addEventListener('click', (e) => {
            // No hacer nada si se hizo clic en el botón de eliminar
            if (e.target.closest('.remove-btn')) return;
            
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
        saveCurrentPlaylist();
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

// Guardar la playlist actual en localStorage
function saveCurrentPlaylist() {
    localStorage.setItem('currentPlaylist', JSON.stringify(playlist));
    localStorage.setItem('currentVideoId', currentVideoId);
    localStorage.setItem('currentPlaylistIndex', currentPlaylistIndex.toString());
}

// Cargar la última playlist usada
function loadLastPlaylist() {
    const savedPlaylist = localStorage.getItem('currentPlaylist');
    const savedVideoId = localStorage.getItem('currentVideoId');
    const savedIndex = localStorage.getItem('currentPlaylistIndex');
    
    if (savedPlaylist) {
        playlist = JSON.parse(savedPlaylist);
        updatePlaylistDisplay();
    }
    
    if (savedVideoId && savedVideoId !== '') {
        currentVideoId = savedVideoId;
        currentPlaylistIndex = savedIndex ? parseInt(savedIndex) : -1;
        playVideo(currentVideoId);
    }
}

// Mostrar modal para guardar playlist
function showSaveModal() {
    if (playlist.length === 0) {
        alert('La playlist está vacía');
        return;
    }
    
    const modal = document.getElementById('save-modal');
    document.getElementById('playlist-name').value = '';
    modal.style.display = 'flex';
}

// Guardar playlist con nombre
function savePlaylist() {
    const nameInput = document.getElementById('playlist-name');
    const name = nameInput.value.trim();
    
    if (name === '') {
        alert('Por favor ingresa un nombre para la playlist');
        return;
    }
    
    // Verificar si ya existe una playlist con ese nombre
    const existingIndex = savedPlaylists.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingIndex >= 0) {
        if (!confirm(`Ya existe una playlist llamada "${name}". ¿Deseas reemplazarla?`)) {
            return;
        }
        savedPlaylists[existingIndex] = { name, videos: [...playlist] };
    } else {
        savedPlaylists.push({ name, videos: [...playlist] });
    }
    
    localStorage.setItem('savedPlaylists', JSON.stringify(savedPlaylists));
    alert(`Playlist "${name}" guardada correctamente`);
    closeModal('save-modal');
}

// Mostrar modal para cargar playlist
function showLoadModal() {
    const modal = document.getElementById('load-modal');
    const playlistsContainer = document.getElementById('saved-playlists');
    
    playlistsContainer.innerHTML = '';
    
    if (savedPlaylists.length === 0) {
        playlistsContainer.innerHTML = '<p>No hay playlists guardadas</p>';
    } else {
        savedPlaylists.forEach((playlist, index) => {
            const playlistElement = document.createElement('div');
            playlistElement.className = 'saved-playlist';
            playlistElement.innerHTML = `
                <h4>${playlist.name}</h4>
                <p>${playlist.videos.length} videos</p>
            `;
            
            playlistElement.addEventListener('click', () => {
                loadPlaylist(index);
                closeModal('load-modal');
            });
            
            playlistsContainer.appendChild(playlistElement);
        });
    }
    
    modal.style.display = 'flex';
}

// Cargar una playlist guardada
function loadPlaylist(index) {
    if (index >= 0 && index < savedPlaylists.length) {
        const selectedPlaylist = savedPlaylists[index];
        playlist = [...selectedPlaylist.videos];
        currentVideoId = '';
        currentPlaylistIndex = -1;
        
        updatePlaylistDisplay();
        saveCurrentPlaylist();
        
        if (playlist.length > 0) {
            playVideo(playlist[0].id);
            currentPlaylistIndex = 0;
        }
        
        alert(`Playlist "${selectedPlaylist.name}" cargada correctamente`);
    }
}

// Limpiar la playlist actual
function clearPlaylist() {
    if (playlist.length === 0) {
        alert('La playlist ya está vacía');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar toda la playlist?')) {
        playlist = [];
        currentVideoId = '';
        currentPlaylistIndex = -1;
        updatePlaylistDisplay();
        saveCurrentPlaylist();
        player.stopVideo();
    }
}

// Cerrar modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
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
    document.getElementById('add-current-btn').addEventListener('click', addCurrentToPlaylist);
    
    // Guardar playlist
    document.getElementById('save-playlist-btn').addEventListener('click', showSaveModal);
    
    // Cargar playlist
    document.getElementById('load-playlist-btn').addEventListener('click', showLoadModal);
    
    // Limpiar playlist
    document.getElementById('clear-playlist-btn').addEventListener('click', clearPlaylist);
    
    // Confirmar guardado de playlist
    document.getElementById('confirm-save').addEventListener('click', savePlaylist);
    
    // Cerrar modales
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});

// Light - Mode 
function myFunction() {
   var element = document.body;
   element.classList.toggle("light-mode");
}
