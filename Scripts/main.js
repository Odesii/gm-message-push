// GM Player Popup Messages Module

class GMPlayerPopup {
  static ID = "gm-player-popup";
  static SOCKET = `module.${GMPlayerPopup.ID}`;

  static initialize() {
    console.log(`${GMPlayerPopup.ID} | Initializing GM Player Popup module`);

    GMPlayerPopup.setupSocket();

    // Add button to GM's toolbar
    if (game.user.isGM) {
      GMPlayerPopup.addGMButton();
    }
  }

  static setupSocket() {
    game.socket.on(GMPlayerPopup.SOCKET, (data) => {
      if (data.type === "popup" && data.targetUser === game.user.id) {
        GMPlayerPopup.showPopup(data.message, data.duration, data.effect);
      }
    });
  }

  static addGMButton() {
    // Add button to scene controls
    Hooks.on("getSceneControlButtons", (controls) => {
      const tokenControls = controls.find((c) => c.name === "token");
      if (tokenControls) {
        tokenControls.tools.push({
          name: "player-popup",
          title: "Send Popup to Player",
          icon: "fas fa-comment",
          onClick: () => GMPlayerPopup.openDialog(),
          button: true,
        });
      }
    });
  }

  static openDialog() {
    const players = game.users.filter((u) => !u.isGM && u.active);

    if (players.length === 0) {
      ui.notifications.warn("No active players to send messages to.");
      return;
    }

    const playerOptions = players
      .map((p) => `<option value="${p.id}">${p.name}</option>`)
      .join("");

    const content = `
      <div class="form-group">
        <label for="popup-message">Message:</label>
        <textarea id="popup-message" name="message" rows="4" style="width: 100%;"></textarea>
      </div>
      <div class="form-group">
        <label for="popup-player">Send to Player:</label>
        <select id="popup-player" name="player" style="width: 100%;">
          <option value="all">All Players</option>
          ${playerOptions}
        </select>
      </div>
      <div class="form-group">
        <label for="popup-duration">Display Duration (seconds):</label>
        <input type="number" id="popup-duration" name="duration" value="5" min="1" max="30" style="width: 100%;">
      </div>
      <div class="form-group">
        <label for="popup-effect">Text Effect:</label>
        <select id="popup-effect" name="effect" style="width: 100%;">
          <option value="none">Normal</option>
          <option value="pulse">Slow Pulse</option>
          <option value="flicker">Flickering</option>
          <option value="glitch">Glitching</option>
          <option value="static">Static</option>
          <option value="combo">Chaos Combo</option>
        </select>
      </div>
    `;

    new Dialog({
      title: "Send Popup Message to Player",
      content: content,
      buttons: {
        send: {
          icon: '<i class="fas fa-paper-plane"></i>',
          label: "Send",
          callback: (html) => {
            const message = html.find("#popup-message").val().trim();
            const targetPlayer = html.find("#popup-player").val();
            const duration = parseInt(html.find("#popup-duration").val()) || 5;
            const effect = html.find("#popup-effect").val();

            if (!message) {
              ui.notifications.error("Please enter a message.");
              return;
            }

            GMPlayerPopup.sendPopup(message, targetPlayer, duration, effect);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
        },
      },
      default: "send",
    }).render(true);
  }

  static sendPopup(message, targetPlayer, duration, effect = "none") {
    const targets =
      targetPlayer === "all"
        ? game.users.filter((u) => !u.isGM && u.active).map((u) => u.id)
        : [targetPlayer];

    targets.forEach((userId) => {
      game.socket.emit(GMPlayerPopup.SOCKET, {
        type: "popup",
        message: message,
        targetUser: userId,
        duration: duration * 1000,
        effect: effect,
      });
    });

    const targetName =
      targetPlayer === "all"
        ? "all players"
        : game.users.get(targetPlayer).name;
    ui.notifications.info(`Popup message sent to ${targetName}.`);
  }

  static showPopup(message, duration = 5000, effect = "none") {
    // Create popup element
    const popup = document.createElement("div");
    popup.className = `gm-player-popup effect-${effect}`;
    popup.innerHTML = `
      <div class="popup-content">
        <button class="popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
        <div class="popup-message">${message}</div>
      </div>
    `;

    // Add to document
    document.body.appendChild(popup);

    // Apply special effects
    if (effect === "combo") {
      GMPlayerPopup.applyChaosCombo(popup);
    } else if (effect === "glitch") {
      GMPlayerPopup.applyGlitchText(popup);
    } else if (effect === "static") {
      GMPlayerPopup.applyStaticEffect(popup);
    }

    // Animate in
    setTimeout(() => popup.classList.add("show"), 100);

    // Auto-remove after duration
    setTimeout(() => {
      popup.classList.remove("show");
      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      }, 300);
    }, duration);
  }
  static applyChaosCombo(popup) {
    const messageEl = popup.querySelector(".popup-message");
    let effects = ["pulse", "flicker", "glitch"];
    let currentEffect = 0;

    const switchEffect = () => {
      messageEl.className = `popup-message effect-${effects[currentEffect]}`;
      currentEffect = (currentEffect + 1) % effects.length;
    };

    switchEffect();
    const interval = setInterval(switchEffect, 1500);

    setTimeout(() => clearInterval(interval), 30000);
  }

  static applyGlitchText(popup) {
    const messageEl = popup.querySelector(".popup-message");
    const originalText = messageEl.textContent;
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?~`";

    const glitch = () => {
      if (Math.random() > 0.7) {
        let glitchedText = "";
        for (let char of originalText) {
          if (Math.random() > 0.8 && char !== " ") {
            glitchedText +=
              glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            glitchedText += char;
          }
        }
        messageEl.textContent = glitchedText;

        setTimeout(() => {
          messageEl.textContent = originalText;
        }, 50 + Math.random() * 100);
      }
    };

    const interval = setInterval(glitch, 200 + Math.random() * 300);
    setTimeout(() => clearInterval(interval), 30000);
  }

  static applyStaticEffect(popup) {
    const messageEl = popup.querySelector(".popup-message");
    const staticChars = "█▓▒░";

    const addStatic = () => {
      if (Math.random() > 0.6) {
        const staticEl = document.createElement("span");
        staticEl.className = "static-char";
        staticEl.textContent =
          staticChars[Math.floor(Math.random() * staticChars.length)];
        staticEl.style.position = "absolute";
        staticEl.style.left = Math.random() * 100 + "%";
        staticEl.style.top = Math.random() * 100 + "%";
        staticEl.style.opacity = "0.7";
        staticEl.style.fontSize = "0.8em";

        messageEl.style.position = "relative";
        messageEl.appendChild(staticEl);

        setTimeout(() => {
          if (staticEl.parentNode) {
            staticEl.parentNode.removeChild(staticEl);
          }
        }, 100 + Math.random() * 200);
      }
    };

    const interval = setInterval(addStatic, 150);
    setTimeout(() => clearInterval(interval), 30000);
  }
}

// Initialize when Foundry is ready
Hooks.once("ready", () => {
  GMPlayerPopup.initialize();
});

// Make available globally for debugging
window.GMPlayerPopup = GMPlayerPopup;
