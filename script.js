// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const searchInput = document.getElementById('searchInput');
    const elementsContainer = document.getElementById('elementsContainer');
    const guideContainer = document.getElementById('guideContainer');
    const copyButton = document.getElementById('copyButton');
    const elementForm = document.getElementById('elementForm');

    fileInput.addEventListener('change', handleFileUpload);
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    copyButton.addEventListener('click', copyGuideToClipboard);

    elementForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const elementName = document.getElementById('elementName').value;
        const elementDesc = document.getElementById('elementDesc').value;
        const subStep1 = document.getElementById('subStep1').value;
        const subStep2 = document.getElementById('subStep2').value;

        try {
            await addDoc(collection(db, 'elements'), {
                name: elementName,
                description: elementDesc,
                subStep1: subStep1,
                subStep2: subStep2,
                primary: 0 // assuming 0 means it's not a primary element
            });
            alert('Element submitted successfully!');
            fetchElements(); // Refresh elements after submission
        } catch (error) {
            console.error('Error adding document: ', error);
        }
    });

    async function fetchElements() {
        const querySnapshot = await getDocs(collection(db, 'elements'));
        let elementsData = {};
        querySnapshot.forEach(doc => {
            elementsData[doc.id] = [doc.data().name, doc.data().description, doc.data().primary, doc.data().subStep1, doc.data().subStep2];
        });
        displayElements(elementsData);
    }

    fetchElements();

    let displayedElements = {};
    const chunkSize = 350; // Number of elements to process at a time

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const elementsData = JSON.parse(e.target.result);
                    displayElements(elementsData);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            };
            reader.onerror = function(e) {
                console.error('File reading error:', e);
            };
            reader.readAsText(file);
        }
    }

    function displayElements(elementsData) {
        elementsContainer.innerHTML = '';
        let keys = Object.keys(elementsData).sort((a, b) => elementsData[a][1].localeCompare(elementsData[b][1]));
        renderElementsChunk(keys, 0, elementsData);
    }

    function renderElementsChunk(keys, start, elementsData) {
        const end = Math.min(start + chunkSize, keys.length);

        for (let i = start; i < end; i++) {
            const key = keys[i];
            const element = elementsData[key];
            const elementDiv = document.createElement('div');
            elementDiv.className = 'element';
            elementDiv.innerHTML = `<div>${element[0]}</div><div>${element[1]}</div>`;
            elementDiv.addEventListener('click', () => showGuide(key, elementsData));
            elementsContainer.appendChild(elementDiv);
        }

        if (end < keys.length) {
            setTimeout(() => renderElementsChunk(keys, end, elementsData), 0);
        }
    }

    function showGuide(elementKey, elementsData) {
        guideContainer.innerHTML = '';
        const steps = [];
        gatherSteps(elementKey, steps, new Set(), elementsData);
        steps.forEach((step, index) => {
            const guideStep = document.createElement('div');
            guideStep.className = 'guide-step';
            guideStep.innerHTML = `<p>Step ${index + 1}: ${step}</p>`;
            guideContainer.appendChild(guideStep);
        });
        guideContainer.style.display = 'block';
    }

    function gatherSteps(elementKey, steps, seen, elementsData) {
        if (seen.has(elementKey) || !elementsData[elementKey]) return; // Check if element exists
        seen.add(elementKey);

        const element = elementsData[elementKey];
        if (element[2] === 1) {
            return; // Skip primary elements
        } else {
            const subStep1 = element[3];
            const subStep2 = element[4];

            if (!subStep1 || !subStep2 || !elementsData[subStep1] || !elementsData[subStep2]) return; // Check if subStep1 and subStep2 exist
            gatherSteps(subStep1, steps, seen, elementsData); // Collect steps recursively
            gatherSteps(subStep2, steps, seen, elementsData); // Collect steps recursively

            const stepDescription = `${elementsData[subStep1][0]} <a href="#" onclick="showGuide('${subStep1}', ${JSON.stringify(elementsData)})">${elementsData[subStep1][1]}</a> + ${elementsData[subStep2][0]} <a href="#" onclick="showGuide('${subStep2}', ${JSON.stringify(elementsData)})">${elementsData[subStep2][1]}</a> =
 ${element[0]} ${element[1]}`;
            if (!steps.includes(stepDescription)) {
                steps.push(stepDescription); // Add the step to the end to ensure order
            }
        }
    }

    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const filteredElements = Object.entries(elementsData)
            .filter(([key, value]) => value[1].toLowerCase().startsWith(query)) // Match elements starting with query
            .sort(([keyA, valueA], [keyB, valueB]) => valueA[1].localeCompare(valueB[1])); // Sort alphabetically

        displayedElements = Object.fromEntries(filteredElements);
        displayElements(displayedElements);
    }

    function copyGuideToClipboard() {
        const range = document.createRange();
        range.selectNodeContents(guideContainer);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            document.execCommand('copy');
            alert('Guide copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
        selection.removeAllRanges(); // Unselect the content after copying
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
});
