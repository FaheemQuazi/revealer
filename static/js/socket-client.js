(function () {
    if( window.location.search.match( /receiver/gi ) ) { return; }

    // Instantiate SocketIO
    const socket = io({
        autoConnect: false
    });
    // grab elements from sm-window
    const elmSockState = document.querySelector("#sm-socket-state");
    const elmSockAddr = document.querySelector("#sm-socket-addr");
    const elmBtnConn = document.querySelector("#sm-socket-conn");

    // Handle connection event
    socket.on('connect', () => {
        console.log('Connected to server');
        elmSockState.innerHTML = "Connected";
        elmSockAddr.setAttribute("disabled", "true");
        elmBtnConn.innerHTML = "Disconnect";
    });
    
    // Handle disconnection event
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        elmSockState.innerHTML = "Disconnected";
        elmSockAddr.removeAttribute("disabled");
        elmBtnConn.innerHTML = "Connect";
    });

    socket.on("connect-error", (error) => {
        console.log('Conn Err', error);
        if (socket.active) {
            elmSockState.innerHTML = "Connection Error";
        } else {
            elmSockState.innerHTML = "Connection Denied";
            elmSockAddr.removeAttribute("disabled");
            elmBtnConn.innerHTML = "Connect";
        }
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
        if (socket.connected) {
            socket.emit('slidechanged', { 
                indexh: event.indexh, 
                indexv: event.indexv, 
                notes: Reveal.getSlideNotes(slide=Reveal.getSlide(event.indexh, event.indexv))
            });
            socket.emit('slidenote', Reveal.getSlideNotes(slide=Reveal.getSlide(event.indexh, event.indexv)));
        }
    });

    // connection button handler in sm-window
    elmBtnConn.addEventListener("click", (evt) => {
        if (socket.connected) {
            socket.disconnect()
        } else {
            socket.io.uri = elmSockAddr.value;
            socket.connect();
        }
    });
})();