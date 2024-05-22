let language = navigator.language;
let dashIndex = language.indexOf('-');
if (dashIndex >= 0) {
    language = language.substring(0, dashIndex);
}

switch (language) {
                case 'ru' :
                document.getElementById("next_event_name").innerText =  "Следующий Ивент";
                document.getElementById("upcoming_events_name").innerText =  "Предстоящие Ивенты";
                document.getElementById("old_events_name").innerText =  "Прошедшие Ивенты";
                document.getElementById("next_steam_sale").innerText =  "Следующая распродажа в Steam";
                
                
                }