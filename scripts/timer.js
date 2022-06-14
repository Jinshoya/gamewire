        let event_date_divs = document.getElementsByClassName("event_date");
        let countdown_divs = document.getElementsByClassName("countdown");

        for(let i = 0; event_date_divs.length > i; i++){
            event_date_divs[i].innerHTML = new Date(Date.parse(event_date_divs[i].getAttribute("data-start-event-date"))).toLocaleString("ru-RU", {
                month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
            });
        }
	    
    	timer_delay = 0;

        for(let i = 0; event_date_divs.length > i; i++) {
            let timer_id = setInterval(function () {
                let event_date = Date.parse(event_date_divs[i].getAttribute("data-start-event-date"));
                let current_time = Date.now();

                if (current_time >= event_date) {
                    countdown_divs[i].innerHTML = "0 д. 0 ч. 0 м. 0 с.";
                    clearInterval(timer_id);
                    return;
                }

                let buf = "";
                let days = Math.floor((event_date - current_time) / 86400000);
                let hours = Math.floor(((event_date - current_time) / 3600000) % 24);
                let minutes = Math.floor(((event_date - current_time) / 60000) % 60);
                let seconds = Math.floor(((event_date - current_time) / 1000) % 60);

                if (days > 0) {
                    buf = days + " д. ";
                }

                if (hours > 0 || buf !== "") {
                    if (buf !== "") {
                        buf += "" + String(hours) + " ч. ";
                    } else {
                        buf = String(hours) + " ч. ";
                    }
                }

                if (minutes > 0 || buf !== "") {
                    if (buf !== "") {
                        buf += "" + String(minutes) + " м. ";
                    } else {
                        buf = String(minutes) + " м. ";
                    }
                }

                if (seconds > 0 || buf !== "") {
                    if (buf !== "") {
                        buf += "" + String(seconds) + " с.";
                    } else {
                        buf = String(seconds) + " с.";
                    }
                }

                countdown_divs[i].innerHTML = buf;
				
                if(timer_delay === 0){
                    timer_delay = 1000;
                }
            }, timer_delay);
        }