const form = document.getElementById("registerForm");
const usersList = document.getElementById("usersList");
const usersMessage = document.getElementById("usersMessage");

function showUsers(users) {
    usersList.innerHTML = "";

    if (users.length === 0) {
        usersMessage.textContent = "Hozircha hech kim ro‘yxatdan o‘tmagan.";
        return;
    }

    usersMessage.textContent = "";
    users.forEach((user) => {
        const item = document.createElement("li");
        item.textContent = `${user.name} — ${user.email}`;
        usersList.appendChild(item);
    });
}

async function loadUsers() {
    try {
        const response = await fetch("/api/users");
        const data = await response.json();
        showUsers(data.users);
    } catch {
        usersMessage.textContent = "Server bilan aloqa yo‘q. Serverni ishga tushiring.";
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value;
    const password = document.getElementById("pass").value;
    const confirmPassword = document.getElementById("confirmPass").value;

    if (name === "" || email === "" || password === "" || confirmPassword === "") {
        alert("Iltimos, barcha maydonlarni to‘ldiring!");
        return;
    }

    if (password !== confirmPassword) {
        alert("Parollar mos kelmadi!");
        return;
    }

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert(data.message);
        form.reset();
        showUsers(data.users);
    } catch {
        alert("Server bilan aloqa qilib bo‘lmadi.");
    }
});

loadUsers();