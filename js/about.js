// About us screen: builds one card per team member from data/team.js.
// A member with no photo link shows their initials instead.

import { TEAM } from "../data/team.js";

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map(function (part) { return part[0]; }).join("").slice(0, 2).toUpperCase();
}

function makeAvatar(member) {
  const box = document.createElement("div");
  box.className = "team-photo";
  const fallback = document.createElement("span");
  fallback.className = "team-initials";
  fallback.textContent = initials(member.name);
  fallback.setAttribute("aria-hidden", "true");
  box.appendChild(fallback);

  const link = (member.photo || "").trim();
  if (link) {
    const img = document.createElement("img");
    img.src = link;
    img.alt = "Photo of " + member.name;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("load", function () { box.classList.add("has-photo"); });
    img.addEventListener("error", function () { img.remove(); }); // a broken link falls back to the initials
    box.appendChild(img);
  }
  return box;
}

export function buildAboutScreen() {
  const grid = document.getElementById("team-grid");
  if (!grid || grid.childElementCount) return;
  // Always shown in alphabetical order of name
  TEAM.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (member) {
    const card = document.createElement("article");
    card.className = "team-card";
    card.appendChild(makeAvatar(member));

    const name = document.createElement("h3");
    name.textContent = member.name;
    card.appendChild(name);

    const role = document.createElement("p");
    role.className = "team-role";
    role.textContent = member.role;
    card.appendChild(role);

    if (member.school) {
      const school = document.createElement("p");
      school.className = "team-school";
      school.textContent = member.school;
      card.appendChild(school);
    }

    const about = document.createElement("p");
    about.className = "team-about";
    about.textContent = member.about;
    card.appendChild(about);

    grid.appendChild(card);
  });
}
