// Collapsible groups ("dropdowns") for the side lists, so a screen shows a few headings instead of
// every option at once. Each group is a heading button (title, the current value, a chevron) and a
// body that holds the rows. Closed groups still show their current value, so nothing is hidden
// without a hint. Keyboard: the heading is a normal button (Tab, Enter or Space).

let nextId = 0;

// container: the element the group is added to
// title: the heading text
// options.open: start open (default false)
// options.onToggle(open): called after the group opens or closes
// Returns { root, body, setOpen(open), isOpen(), setValue(text) }; add the rows to body.
export function createDropdownGroup(container, title, options) {
  options = options || {};
  const id = "dd-" + (++nextId);
  const root = document.createElement("section");
  root.className = "dd-group";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "dd-toggle";
  toggle.setAttribute("aria-controls", id);
  toggle.innerHTML =
    '<span class="dd-title"></span><span class="dd-value"></span>' +
    '<svg class="dd-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  if (toggle.querySelector) toggle.querySelector(".dd-title").textContent = title;

  const body = document.createElement("div");
  body.className = "dd-body";
  body.id = id;

  root.appendChild(toggle);
  root.appendChild(body);
  container.appendChild(root);

  let open = false;
  function setOpen(value) {
    open = Boolean(value);
    root.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    body.hidden = !open;
  }
  setOpen(Boolean(options.open));

  toggle.addEventListener("click", function () {
    setOpen(!open);
    if (options.onToggle) options.onToggle(open);
  });

  return {
    root: root,
    body: body,
    setOpen: setOpen,
    isOpen: function () { return open; },
    setValue: function (text) {
      const value = toggle.querySelector ? toggle.querySelector(".dd-value") : null;
      if (value) value.textContent = text || "";
    }
  };
}
