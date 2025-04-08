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

async function loadAvailability(forcedSpace = null) {
    const spaceDropdown = document.getElementById('spaces');
    const space = forcedSpace || spaceDropdown?.value;

    if (!space) return;

    const availabilityDiv = document.getElementById('space-availability');
    if (!availabilityDiv) return;

    clearSlots();
    generatedSpaces.clear();

    if (!generatedSpaces.has(space)) {
        slots[space] = generateSlots(5, 5); // or whatever dimensions apply to Third Floor
        generatedSpaces.add(space);
    }

    const now = new Date();
    const selectedDate = now.toISOString().split('T')[0];
    const selectedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    availabilityDiv.classList.add('space-availability');

    const response = await fetch(`/api/reservations?space=${space}&date=${selectedDate}`);

    const reservations = await response.json();

    const activeReservations = reservations.filter(reservation => reservation.status !== 'completed');

    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

    slots[space].forEach(slot => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'slot';

        const reservation = activeReservations.find(res => res.slotId === slot.id);

        if (reservation) {
            slotDiv.classList.add('space-reserved');
        
            if (loggedInUser.role === 'technician') {
                const infoDiv = document.createElement('div');
                infoDiv.textContent = reservation.anonymous
                    ? 'Reserved (Anonymous)'
                    : `ID: ${reservation.userId}`;
                slotDiv.appendChild(infoDiv);
            } else {
                slotDiv.textContent = 'Reserved';
            }
        
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

            // Add this line in handleReservationLink before redirect:
        window.selectedReservation.status = 'active';

        // And include it in the redirect URL:
        window.location.href = `/adminReserveDetails?space=${space}&date=${date}&time=${time}&slotId=${slotId}&userId=${userID}&status=active`;

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

    // If dropdown exists but has no value selected, default to "Third Floor"
    const defaultSpace = "Third Floor";
    if (!spaceDropdown?.value) {
        loadAvailability(defaultSpace);
    } else {
        loadAvailability();
    }

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

