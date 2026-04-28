export const INSTALL_PROMPT_EVENT_KEY = "__backpropInstallPromptEvent";

export const INSTALL_PROMPT_CAPTURE_SCRIPT = `(() => {
  const eventKey = ${JSON.stringify(INSTALL_PROMPT_EVENT_KEY)};
  if (window[eventKey] === undefined) {
    window[eventKey] = null;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window[eventKey] = event;
  });
})();`;
