const slots = {}; // Store slots for each space
const generatedSpaces = new Set(); // Track which spaces have been generated

function generateSlots(rows, cols) {
    const slots = [];
    let id = 1;
    for (let row = 1; row <= rows; row++) {
        for (let col = 1; col <= cols; col++) {
            slots.push({ id: id, available: true, user: null, reservationDate: null, slot: `Slot ${id}` });
            id++;
        }
    }
    return slots;
}

async function loadAvailability() {
    const space = document.getElementById('spaces').value;
    if (!space) return;

    const availabilityDiv = document.getElementById('space-availability');
    if (!availabilityDiv) return;

    // Clear existing slots before adding new ones
    clearSlots();

    // Clear the generatedSpaces set to force regeneration of slots for new space
    generatedSpaces.clear();

    // Generate slots only if they haven't been generated before
    if (!generatedSpaces.has(space)) {
        slots[space] = generateSlots(5, 5);
        generatedSpaces.add(space);  // Mark space as generated
    }

    const now = new Date();
    const selectedDate = now.toISOString().split('T')[0];
    const selectedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    availabilityDiv.classList.add('space-availability');

    const response = await fetch(`/api/reservations?space=${space}&date=${selectedDate}&time=${selectedTime}`);
    const reservations = await response.json();

    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

    // Render the slots for the selected space
    slots[space].forEach(slot => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'slot';

        const reservation = reservations.find(res => res.slotId === slot.id);

        if (reservation) {
            const userLink = document.createElement('a');
            userLink.textContent = reservation.anonymous ? 'Anonymous' : reservation.userID;
            if (!reservation.anonymous) {
                userLink.href = `/userprofile/${encodeURIComponent(reservation.userName)}`;
            }
            slotDiv.appendChild(userLink);
            slotDiv.classList.add('space-reserved');
        } else {
            slot.available = true;
            slot.reservationDate = null;

            slotDiv.textContent = 'Available';
            slotDiv.classList.add('space-available');

            if (loggedInUser.role === 'technician') {
                slotDiv.addEventListener('click', () => {
                    handleReservationLink(space, selectedDate, selectedTime, slot.id);
                    highlightSlot(slotDiv);
                });
            } else if (loggedInUser.role === 'student') {
                slotDiv.classList.add('disabled-slot');
                slotDiv.style.cursor = 'not-allowed';
            }
        }

        const slotName = document.createElement('div');
        slotName.textContent = slot.slot;
        slotDiv.appendChild(slotName);

        availabilityDiv.appendChild(slotDiv);
    });
}

// Function to clear existing slots
function clearSlots() {
    const availabilityDiv = document.getElementById('space-availability');
    while (availabilityDiv.firstChild) {
        availabilityDiv.removeChild(availabilityDiv.firstChild);
    }
}



async function handleReservationLink(space, date, time, slotId) {
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

    if (loggedInUser.role === 'technician') {
        const studentName = formatName(document.getElementById('name')?.value || '');
        const userID = document.getElementById('id')?.value || '';

        if (!userID || userID.length !== 8 || isNaN(userID)) {
            alert('Please enter a valid 8-digit ID number.');
            return;
        }

        const isValidUser = await checkUserInDatabase(userID);
        if (!isValidUser) {
            alert('The entered user ID does not exist.');
            return;
        }

        // Prepare data for the reservation
        window.selectedReservation = {
            space,
            date,
            time,
            slotId,
            userName: studentName,
            userId: userID
        };

        // Redirect to the details page
        window.location.href = `/adminReserveDetails?space=${space}&date=${date}&time=${time}&slotId=${slotId}`;
    }
}

function formatName(name) {
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

async function checkUserInDatabase(userId) {
    try {
        const response = await fetch(`/api/usersById?userId=${encodeURIComponent(userId)}`);
        const users = await response.json();
        return users.length > 0;
    } catch (err) {
        console.error('Error checking user:', err);
        return false;
    }
}

function highlightSlot(selectedSlotDiv) {
    const allSlots = document.querySelectorAll('.slot');
    allSlots.forEach(slot => slot.classList.remove('selected-slot'));
    selectedSlotDiv.classList.add('selected-slot');
}

function updateDateTimeDisplay() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');

    if (dateInput) dateInput.value = todayStr;
    if (timeInput) timeInput.value = timeStr;
}

document.addEventListener('DOMContentLoaded', () => {
    const spaceDropdown = document.getElementById('spaces');
    updateDateTimeDisplay();

    spaceDropdown?.addEventListener('change', () => {
        updateDateTimeDisplay();
        loadAvailability();
    });

    setInterval(() => {
        updateDateTimeDisplay();
        loadAvailability();
    }, 60000);

    document.getElementById("cancel").addEventListener("click", function () {
        const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
        window.location.href = (loggedInUser.role === 'student') ? 'mainMenu' : 'adminMenu';
    });
});
