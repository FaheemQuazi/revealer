(function () {
    if( window.location.search.match( /receiver/gi ) ) { return; }

    // Connect to the server
    const socket = io('http://localhost:3000');
    var statusElement = document.createElement('div');
    statusElement.style.position = 'absolute';
    statusElement.style.left = '10px';
    statusElement.style.top = '10px';
    statusElement.style.margin = '10px';
    statusElement.style.padding = '5px';
    statusElement.style.backgroundColor = 'red';
    statusElement.style.display = 'block';
    statusElement.style.fontFamily = 'monospace';
    statusElement.style.fontSize = '10px';
    statusElement.style.color = 'white';
    document.body.appendChild(statusElement);

    // Handle connection event
    socket.on('connect', () => {
        console.log('Connected to server');
        statusElement.innerText = "Connected";
        statusElement.style.display = 'block';
        statusElement.style.backgroundColor = 'green';
        statusElement.style.opacity = 1;
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    });
    
    // Handle disconnection event
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        statusElement.innerText = "Disconnected";
        statusElement.style.display = 'block';
        statusElement.style.backgroundColor = 'red';
        statusElement.style.opacity = 1;
        setTimeout(() => {
            statusElement.style.opacity=0.25;
        }, 3000);
    });

    socket.on('refresh', () => {
        window.location.reload();
    });

    // Slide change handler
    Reveal.on('slidechanged', function(event) {
        socket.emit('slidechanged', { 
            indexh: event.indexh, 
            indexv: event.indexv, 
            notes: Reveal.getSlideNotes(slide=Reveal.getSlide(event.indexh, event.indexv))
        });
    });
    
    // Ensure first slide is broadcast
    Reveal.on( 'ready', event => {
        // event.currentSlide, event.indexh, event.indexv
        socket.emit('slidechanged', { 
            indexh: event.indexh, 
            indexv: event.indexv, 
            notes: Reveal.getSlideNotes(slide=Reveal.getSlide(event.indexh, event.indexv))
        });
        socket.emit('slidenote', Reveal.getSlideNotes(slide=Reveal.getSlide(event.indexh, event.indexv)));
    });
})();