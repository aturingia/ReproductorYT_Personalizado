// ============== CONFIGURACIÓN ==============
        // ¡¡¡REEMPLAZA ESTO CON TU PROPIA CLAVE DE API!!!
        const API_KEY = 'AIzaSyBSMTFseDyvuoFckww1F28qBPHR9tqt_GA';
        // ===========================================

        // 1. Carga la API del IFrame Player de YouTube de forma asíncrona.
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        let player;
        // 2. Esta función se ejecuta cuando la API está lista.
        function onYouTubeIframeAPIReady() {
            // Inicializa el reproductor aquí si quieres que un video aparezca al cargar.
            // Por ahora lo dejamos vacío para que el usuario busque primero.
        }

        // 3. Referencias a los elementos del DOM
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const voiceSearchButton = document.getElementById('voiceSearchButton');
        const resultsContainer = document.getElementById('results-container');
        
        // 4. Lógica de Búsqueda por Teclado
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });

        function performSearch() {
            const query = searchInput.value;
            if (query) {
                searchVideos(query);
            }
        }
        
        async function searchVideos(query) {
            resultsContainer.innerHTML = '<p>Buscando...</p>';
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video&maxResults=10`;

            try {
                const response = await fetch(url);
                const data = await response.json();
                displayResults(data.items);
            } catch (error) {
                console.error('Error al buscar videos:', error);
                resultsContainer.innerHTML = '<p>Error al cargar los resultados. Verifica la clave de API.</p>';
            }
        }

        function displayResults(videos) {
            resultsContainer.innerHTML = ''; // Limpiar resultados anteriores
            if (!videos || videos.length === 0) {
                resultsContainer.innerHTML = '<p>No se encontraron videos.</p>';
                return;
            }

            videos.forEach(video => {
                const videoItem = document.createElement('div');
                videoItem.classList.add('video-item');
                videoItem.dataset.videoId = video.id.videoId; // Guardar el ID del video
                
                videoItem.innerHTML = `
                    <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}">
                    <p>${video.snippet.title}</p>
                `;

                videoItem.addEventListener('click', () => {
                    playVideo(video.id.videoId);
                });

                resultsContainer.appendChild(videoItem);
            });
        }

        function playVideo(videoId) {
            if (player) {
                player.loadVideoById(videoId);
            } else {
                player = new YT.Player('player', {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: {
                        'playsinline': 1,
                        'autoplay': 1, // Autoplay del video seleccionado
                    },
                    events: {
                        'onReady': (event) => event.target.playVideo()
                    }
                });
            }
             // Scroll hacia el reproductor para mejor UX
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }


        // 5. Lógica de Búsqueda por Voz (Web Speech API)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES'; // Configurar idioma
            recognition.continuous = false;
            recognition.interimResults = false;

            voiceSearchButton.addEventListener('click', () => {
                voiceSearchButton.textContent = '...';
                voiceSearchButton.disabled = true;
                recognition.start();
            });

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                searchInput.value = transcript;
                performSearch(); // Realizar la búsqueda con el texto reconocido
            };
            
            recognition.onerror = (event) => {
                console.error("Error en reconocimiento de voz:", event.error);
                 voiceSearchButton.textContent = '🎤';
                voiceSearchButton.disabled = false;
            }

            recognition.onend = () => {
                voiceSearchButton.textContent = '🎤';
                voiceSearchButton.disabled = false;
            };

        } else {
            console.warn("La API de reconocimiento de voz no es compatible con este navegador.");
            voiceSearchButton.style.display = 'none'; // Ocultar el botón si no es compatible
        }

//================ Youtube-Player-Playlist =================

// JavaScript
function loadPlaylist() {
    var playlistURL = document.getElementById('playlistURL').value;
    var playlistID = playlistURL.split('list=')[1];

    var playerDiv = document.getElementById('playerList');
   playerDiv.innerHTML = `<iframe max-width="800" height="100%" src="https://www.youtube.com/embed?listType=playlist&list=${playlistID}&autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
};