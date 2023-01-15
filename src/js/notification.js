let waiting_timer = undefined;
let notif_queue = [];

function notif(notif_c) {
    let notification_area = document.querySelector(".statusline .notification-area");

    if ((notification_area.querySelector(".notification") === null) && (waiting_timer === undefined)) {
        // This is just so no notifications will be played and disappears while the full screen landscape warning is in the way.
        if( (screen.availHeight > screen.availWidth) && (!document.body.classList.contains("ignore-landscape-warning"))){
            waiting_timer = setInterval(() => {
                if( (screen.availHeight < screen.availWidth) || (document.body.classList.contains("ignore-landscape-warning"))){
                    clearInterval(waiting_timer);
                    waiting_timer = undefined;
                    notif(notif_queue.pop());
                }
            }, 1000);
            notif_queue.push(notif_c);
            return;
        }

        let notif_elem = document.createElement("div");
        notif_elem.className = "notification";
        notif_elem.appendChild(notif_c[0]);
        notif_elem.appendChild(notif_c[1]);

        notification_area.appendChild(notif_elem);

        notification_area.classList.add("show");
        setTimeout(() => {
            notification_area.classList.remove("show");
            notif_elem.querySelector("p").style.opacity = "0";
            setTimeout(() => {
                notification_area.removeChild(notif_elem);
                if (notif_queue.length > 0) {
                    notif(notif_queue.pop());
                }
            }, 1000);
        }, 10000);
    } else {
        notif_queue.push(notif_c);
    }
}

export function notif_alert(alert_str) {
    let div = document.createElement("div");
    div.className = "notification-content";

    let text = document.createElement("p");
    text.innerHTML = alert_str;
    div.appendChild(text);

    let icon = document.createElement("i");
    icon.className = "alert fas fa-exclamation-triangle";
    div.appendChild(icon);

    notif([icon, div]);
}

export function notif_warn(alert_str) {
    let div = document.createElement("div");
    div.className = "notification-content";

    let text = document.createElement("p");
    text.innerHTML = alert_str;
    div.appendChild(text);

    let icon = document.createElement("i");
    icon.className = "warning fas fa-exclamation-triangle";
    div.appendChild(icon);

    notif([icon, div]);
}

export function notif_info(info_str) {
    let div = document.createElement("div");
    div.className = "notification-content";

    let text = document.createElement("p");
    text.innerHTML = info_str;
    div.appendChild(text);

    let icon = document.createElement("i");
    icon.className = "info fas fa-info-circle";
    div.appendChild(icon);

    notif([icon, div]);
}

export function notif_success(success_str) {
    let div = document.createElement("div");
    div.className = "notification-content";

    let text = document.createElement("p");
    text.innerHTML = success_str;
    div.appendChild(text);

    let icon = document.createElement("i");
    icon.className = "success fas fa-check-circle";
    div.appendChild(icon);

    notif([icon, div]);
}
