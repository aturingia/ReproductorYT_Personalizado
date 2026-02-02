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
    loadLastPlaylist();
}

// Manejar cambios de estado del reproductor
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED && playlist.length > 0) {
        playNextVideo();
    }
}

// ========== FUNCIONALIDADES DE BÚSQUEDA ==========

function searchVideos() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();
    
    if (query === '') {
        alert('Por favor ingresa un término de búsqueda');
        return;
    }
    
    const API_KEY = 'AIzaSyBSMTFseDyvuoFckww1F28qBPHR9tqt_GA'; // Reemplaza con tu API key
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=300&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video`;
    
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

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No se encontraron resultados.</div>';
        return;
    }
    
    results.forEach((item) => {
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
                <button class="add-to-playlist-btn" data-id="${videoId}" data-title="${title}" data-thumbnail="${thumbnail}">
                    <i class="fas fa-plus"></i> Añadir
                </button>
            </div>
        `;
        
        resultElement.addEventListener('click', (e) => {
            if (!e.target.closest('.add-to-playlist-btn')) {
                playVideo(videoId);
            }
        });
        
        const addBtn = resultElement.querySelector('.add-to-playlist-btn');
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToPlaylist(videoId, title, thumbnail);
        });
        
        resultsContainer.appendChild(resultElement);
    });
}

// ========== FUNCIONALIDADES DE REPRODUCCIÓN ==========

function playVideo(videoId) {
    if (!player) return;
    
    currentVideoId = videoId;
    player.loadVideoById(videoId);
    highlightCurrentVideoInPlaylist(videoId);
}

function playNextVideo() {
    if (playlist.length === 0) return;
    
    currentPlaylistIndex = (currentPlaylistIndex + 1) % playlist.length;
    playVideo(playlist[currentPlaylistIndex].id);
}

// ========== FUNCIONALIDADES DE PLAYLIST ==========

function addToPlaylist(videoId, title, thumbnail) {
    if (playlist.some(item => item.id === videoId)) {
        alert('Este video ya está en la playlist');
        return;
    }
    
    playlist.push({
        id: videoId,
        title: title,
        thumbnail: thumbnail,
        addedAt: new Date().toISOString()
    });
    
    updatePlaylistDisplay();
    saveCurrentPlaylist();
    
    if (playlist.length === 1) {
        playVideo(videoId);
        currentPlaylistIndex = 0;
    }
}

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
                <span class="video-title">${index + 1}. ${item.title}</span>
            </div>
            <button class="remove-btn" data-index="${index}"><i class="fas fa-times"></i></button>
        `;
        
        li.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-btn')) {
                playVideo(item.id);
                currentPlaylistIndex = index;
            }
        });
        
        const removeBtn = li.querySelector('.remove-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromPlaylist(index);
        });
        
        playlistElement.appendChild(li);
    });
}

function removeFromPlaylist(index) {
    if (index >= 0 && index < playlist.length) {
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
            if (currentPlaylistIndex > index) {
                currentPlaylistIndex--;
            }
        }
        
        updatePlaylistDisplay();
        saveCurrentPlaylist();
    }
}

function highlightCurrentVideoInPlaylist(videoId) {
    document.querySelectorAll('#playlist li').forEach(item => {
        item.classList.remove('active');
    });
    
    playlist.forEach((item, index) => {
        if (item.id === videoId) {
            currentPlaylistIndex = index;
            const listItems = document.querySelectorAll('#playlist li');
            if (listItems[index]) {
                listItems[index].classList.add('active');
            }
        }
    });
}

// ========== GUARDADO Y CARGA LOCAL ==========

function saveCurrentPlaylist() {
    localStorage.setItem('currentPlaylist', JSON.stringify(playlist));
    localStorage.setItem('currentVideoId', currentVideoId);
    localStorage.setItem('currentPlaylistIndex', currentPlaylistIndex.toString());
}

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

// ========== EXPORTACIÓN DE PLAYLISTS ==========

function showExportModal() {
    if (playlist.length === 0) {
        alert('La playlist está vacía');
        return;
    }
    
    const modal = document.getElementById('export-modal');
    const previewContent = document.getElementById('export-preview-content');
    
    // Generar vista previa
    const exportData = generateExportData();
    previewContent.textContent = JSON.stringify(exportData, null, 2);
    
    modal.style.display = 'flex';
}

function generateExportData() {
    return {
        name: `Mi Playlist ${new Date().toLocaleDateString()}`,
        created: new Date().toISOString(),
        videos: playlist,
        count: playlist.length,
        version: '1.0'
    };
}

function exportAsJSON() {
    const exportData = generateExportData();
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `youtube-playlist-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.getElementById('download-link');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    alert('Playlist exportada como JSON');
}

function exportAsText() {
    let textContent = `Playlist de YouTube\n`;
    textContent += `Exportada: ${new Date().toLocaleString()}\n`;
    textContent += `Total de videos: ${playlist.length}\n\n`;
    
    playlist.forEach((video, index) => {
        textContent += `${index + 1}. ${video.title}\n`;
        textContent += `   ID: ${video.id}\n`;
        textContent += `   URL: https://www.youtube.com/watch?v=${video.id}\n\n`;
    });
    
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent);
    const exportFileDefaultName = `youtube-playlist-${new Date().toISOString().slice(0, 10)}.txt`;
    
    const linkElement = document.getElementById('download-link');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    alert('Playlist exportada como texto');
}

function exportShareLink() {
    // Para compartir, creamos un objeto compacto con solo los IDs
    const videoIds = playlist.map(video => video.id);
    const shareData = {
        v: videoIds,
        n: `Playlist con ${playlist.length} videos`,
        t: Date.now()
    };
    
    // Codificar en Base64 para el enlace
    const encodedData = btoa(JSON.stringify(shareData));
    
    // En una aplicación real, esto se subiría a un servidor
    // Por ahora, lo copiamos al portapapeles
    const shareText = `Compartir esta playlist:\n\nDatos: ${encodedData}\n\nCopia estos datos e impórtalos en la sección "Pegar texto"`;
    
    navigator.clipboard.writeText(shareText).then(() => {
        alert('Datos de la playlist copiados al portapapeles. Compártelos con otros usuarios.');
    }).catch(err => {
        console.error('Error al copiar al portapapeles:', err);
        alert('Error al copiar al portapapeles. Intenta manualmente.');
    });
}

// ========== IMPORTACIÓN DE PLAYLISTS ==========

function showImportModal() {
    const modal = document.getElementById('import-modal');
    modal.style.display = 'flex';
}

function switchImportMethod(method) {
    // Ocultar todos los métodos
    document.querySelectorAll('.import-method').forEach(el => {
        el.classList.remove('active');
    });
    
    // Mostrar el método seleccionado
    document.getElementById(`method-${method}`).classList.add('active');
    
    // Actualizar pestañas activas
    document.querySelectorAll('.method-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`.method-tab[data-method="${method}"]`).classList.add('active');
}

async function importPlaylist() {
    const activeMethod = document.querySelector('.import-method.active').id.replace('method-', '');
    
    try {
        let playlistData;
        
        switch(activeMethod) {
            case 'upload':
                playlistData = await handleFileUpload();
                break;
            case 'text':
                playlistData = await handleTextImport();
                break;
            case 'url':
                playlistData = await handleUrlImport();
                break;
            default:
                throw new Error('Método de importación no válido');
        }
        
        if (playlistData && playlistData.videos && Array.isArray(playlistData.videos)) {
            // Preguntar si reemplazar o añadir
            const action = confirm('¿Deseas reemplazar la playlist actual (Aceptar) o añadir a ella (Cancelar)?');
            
            if (action) {
                // Reemplazar
                playlist = playlistData.videos;
            } else {
                // Añadir (sin duplicados)
                playlistData.videos.forEach(video => {
                    if (!playlist.some(item => item.id === video.id)) {
                        playlist.push(video);
                    }
                });
            }
            
            updatePlaylistDisplay();
            saveCurrentPlaylist();
            
            if (playlist.length > 0) {
                playVideo(playlist[0].id);
                currentPlaylistIndex = 0;
            }
            
            alert(`Playlist importada correctamente. ${playlistData.videos.length} videos cargados.`);
            closeModal('import-modal');
            
        } else {
            throw new Error('Formato de playlist inválido');
        }
        
    } catch (error) {
        alert(`Error al importar playlist: ${error.message}`);
    }
}

function handleFileUpload() {
    return new Promise((resolve, reject) => {
        const fileInput = document.getElementById('file-upload');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            reject(new Error('No se seleccionó ningún archivo'));
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const playlistData = parsePlaylistContent(content, file.name);
                resolve(playlistData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error al leer el archivo'));
        };
        
        reader.readAsText(file);
    });
}

function handleTextImport() {
    return new Promise((resolve, reject) => {
        const textArea = document.getElementById('import-text');
        const content = textArea.value.trim();
        
        if (!content) {
            reject(new Error('No hay texto para importar'));
            return;
        }
        
        try {
            const playlistData = parsePlaylistContent(content);
            resolve(playlistData);
        } catch (error) {
            reject(error);
        }
    });
}

async function handleUrlImport() {
    const urlInput = document.getElementById('import-url');
    const url = urlInput.value.trim();
    
    if (!url) {
        throw new Error('No se proporcionó URL');
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const content = await response.text();
        return parsePlaylistContent(content, url);
        
    } catch (error) {
        throw new Error(`Error al cargar desde URL: ${error.message}`);
    }
}

function parsePlaylistContent(content, sourceName = '') {
    try {
        // Intentar parsear como JSON
        const jsonData = JSON.parse(content);
        
        if (jsonData.videos && Array.isArray(jsonData.videos)) {
            return jsonData;
        } else if (Array.isArray(jsonData)) {
            return { videos: jsonData };
        } else {
            throw new Error('Formato JSON inválido');
        }
        
    } catch (jsonError) {
        // Si no es JSON, intentar parsear como texto plano
        return parseTextPlaylist(content, sourceName);
    }
}

function parseTextPlaylist(content, sourceName) {
    const lines = content.split('\n');
    const videos = [];
    let currentVideo = null;
    
    lines.forEach(line => {
        line = line.trim();
        
        // Buscar patrones de video
        if (line.startsWith('http') && line.includes('youtube.com/watch?v=')) {
            const match = line.match(/v=([a-zA-Z0-9_-]{11})/);
            if (match) {
                if (currentVideo) {
                    videos.push(currentVideo);
                }
                currentVideo = {
                    id: match[1],
                    title: `Video importado ${videos.length + 1}`,
                    thumbnail: '',
                    addedAt: new Date().toISOString()
                };
            }
        } else if (line.startsWith('ID:')) {
            const id = line.replace('ID:', '').trim();
            if (id.length === 11 && !currentVideo) {
                currentVideo = {
                    id: id,
                    title: `Video importado ${videos.length + 1}`,
                    thumbnail: '',
                    addedAt: new Date().toISOString()
                };
            }
        } else if (line && !line.startsWith('#') && !line.startsWith('Playlist') && 
                   !line.startsWith('Exportada') && !line.startsWith('Total') && 
                   currentVideo && !currentVideo.title.startsWith('Video importado')) {
            // Asumir que es el título
            currentVideo.title = line;
        }
    });
    
    if (currentVideo) {
        videos.push(currentVideo);
    }
    
    if (videos.length === 0) {
        throw new Error('No se encontraron videos en el archivo');
    }
    
    return {
        name: sourceName || 'Playlist importada',
        created: new Date().toISOString(),
        videos: videos,
        count: videos.length
    };
}

// ========== GESTIÓN DE PLAYLISTS GUARDADAS ==========

function showSaveModal() {
    if (playlist.length === 0) {
        alert('La playlist está vacía');
        return;
    }
    
    const modal = document.getElementById('save-modal');
    document.getElementById('playlist-name').value = '';
    modal.style.display = 'flex';
}

function savePlaylist() {
    const nameInput = document.getElementById('playlist-name');
    const name = nameInput.value.trim();
    
    if (name === '') {
        alert('Por favor ingresa un nombre para la playlist');
        return;
    }
    
    const existingIndex = savedPlaylists.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingIndex >= 0) {
        if (!confirm(`Ya existe una playlist llamada "${name}". ¿Deseas reemplazarla?`)) {
            return;
        }
        savedPlaylists[existingIndex] = { 
            name, 
            videos: [...playlist],
            savedAt: new Date().toISOString(),
            videoCount: playlist.length
        };
    } else {
        savedPlaylists.push({ 
            name, 
            videos: [...playlist],
            savedAt: new Date().toISOString(),
            videoCount: playlist.length
        });
    }
    
    localStorage.setItem('savedPlaylists', JSON.stringify(savedPlaylists));
    alert(`Playlist "${name}" guardada correctamente`);
    closeModal('save-modal');
}

function showLoadModal() {
    const modal = document.getElementById('load-modal');
    const playlistsContainer = document.getElementById('saved-playlists');
    
    playlistsContainer.innerHTML = '';
    
    if (savedPlaylists.length === 0) {
        playlistsContainer.innerHTML = '<p>No hay playlists guardadas</p>';
    } else {
        savedPlaylists.forEach((playlistItem, index) => {
            const playlistElement = document.createElement('div');
            playlistElement.className = 'saved-playlist';
            playlistElement.innerHTML = `
                <h4>${playlistItem.name}</h4>
                <p>${playlistItem.videoCount || playlistItem.videos.length} videos</p>
                <p class="save-date">Guardada: ${new Date(playlistItem.savedAt).toLocaleDateString()}</p>
                <div class="saved-playlist-actions">
                    <button class="load-btn" data-index="${index}"><i class="fas fa-play"></i> Cargar</button>
                    <button class="export-saved-btn" data-index="${index}"><i class="fas fa-download"></i> Exportar</button>
                    <button class="delete-saved-btn" data-index="${index}"><i class="fas fa-trash"></i> Eliminar</button>
                </div>
            `;
            
            playlistsContainer.appendChild(playlistElement);
        });
    }
    
    modal.style.display = 'flex';
}

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
        closeModal('load-modal');
    }
}

function deleteSavedPlaylist(index) {
    if (confirm('¿Estás seguro de que quieres eliminar esta playlist guardada?')) {
        savedPlaylists.splice(index, 1);
        localStorage.setItem('savedPlaylists', JSON.stringify(savedPlaylists));
        showLoadModal(); // Refrescar la lista
    }
}

function exportSavedPlaylist(index) {
    if (index >= 0 && index < savedPlaylists.length) {
        const playlistData = savedPlaylists[index];
        const dataStr = JSON.stringify(playlistData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `${playlistData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        
        const linkElement = document.getElementById('download-link');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
}

// ========== FUNCIONALIDADES AUXILIARES ==========

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

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function startVoiceSearch() {
    const voiceStatus = document.getElementById('voice-status');
    voiceStatus.style.display = 'block';
    
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

// ========== EVENT LISTENERS ==========

document.addEventListener('DOMContentLoaded', function() {
    // Búsqueda
    document.getElementById('search-btn').addEventListener('click', searchVideos);
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchVideos();
    });
    document.getElementById('voice-btn').addEventListener('click', startVoiceSearch);
    
    // Playlist básica
    document.getElementById('add-current-btn').addEventListener('click', () => {
        if (currentVideoId) {
            const currentVideo = searchResults.find(item => item.id.videoId === currentVideoId);
            if (currentVideo) {
                addToPlaylist(
                    currentVideoId,
                    currentVideo.snippet.title,
                    currentVideo.snippet.thumbnails.default.url
                );
            } else {
                addToPlaylist(currentVideoId, `Video ID: ${currentVideoId}`, '');
            }
        } else {
            alert('No hay ningún video reproduciéndose');
        }
    });
    
    // Guardar/Cargar
    document.getElementById('save-playlist-btn').addEventListener('click', showSaveModal);
    document.getElementById('load-playlist-btn').addEventListener('click', showLoadModal);
    document.getElementById('confirm-save').addEventListener('click', savePlaylist);
    
    // Exportar/Importar
    document.getElementById('export-playlist-btn').addEventListener('click', showExportModal);
    document.getElementById('import-playlist-btn').addEventListener('click', showImportModal);
    
    document.getElementById('export-json').addEventListener('click', exportAsJSON);
    document.getElementById('export-text').addEventListener('click', exportAsText);
    document.getElementById('export-share').addEventListener('click', exportShareLink);
    
    document.getElementById('confirm-import').addEventListener('click', importPlaylist);
    
    // Métodos de importación
    document.querySelectorAll('.method-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const method = this.getAttribute('data-method');
            switchImportMethod(method);
        });
    });
    
    // Drag and drop para archivos
    const fileDropArea = document.querySelector('.file-drop-area');
    const fileInput = document.getElementById('file-upload');
    
    fileDropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropArea.classList.add('dragover');
    });
    
    fileDropArea.addEventListener('dragleave', () => {
        fileDropArea.classList.remove('dragover');
    });
    
    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            
            // Mostrar nombre de archivo
            const fileName = e.dataTransfer.files[0].name;
            const fileInfo = fileDropArea.querySelector('.file-info');
            fileInfo.textContent = `Archivo seleccionado: ${fileName}`;
            fileInfo.style.color = 'var(--success-color)';
        }
    });
    
    // Cambiar método de importación cuando se selecciona archivo
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            const fileName = this.files[0].name;
            const fileInfo = fileDropArea.querySelector('.file-info');
            fileInfo.textContent = `Archivo seleccionado: ${fileName}`;
            fileInfo.style.color = 'var(--success-color)';
        }
    });
    
    // Limpiar
    document.getElementById('clear-playlist-btn').addEventListener('click', clearPlaylist);
    
    // Cerrar modales
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Delegación de eventos para playlists guardadas
    document.addEventListener('click', function(e) {
        // Cargar playlist
        if (e.target.closest('.load-btn')) {
            const index = e.target.closest('.load-btn').getAttribute('data-index');
            loadPlaylist(parseInt(index));
        }
        
        // Exportar playlist guardada
        if (e.target.closest('.export-saved-btn')) {
            const index = e.target.closest('.export-saved-btn').getAttribute('data-index');
            exportSavedPlaylist(parseInt(index));
        }
        
        // Eliminar playlist guardada
        if (e.target.closest('.delete-saved-btn')) {
            const index = e.target.closest('.delete-saved-btn').getAttribute('data-index');
            deleteSavedPlaylist(parseInt(index));
        }
    });
});