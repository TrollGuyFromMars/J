import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD2NW6dGLJoZROaS6XlYTObRE9e868hlEE",
    authDomain: "ok12345-389e2.firebaseapp.com",
    projectId: "ok12345-389e2",
    storageBucket: "ok12345-389e2.appspot.com",
    messagingSenderId: "961029731143",
    appId: "1:961029731143:web:aa8c884a13b498c1eb5262"
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
        elementsData = {};
        querySnapshot.forEach(doc => {
            elementsData[doc.id] = [doc.data().name, doc.data().description, doc.data().primary, doc.data().subStep1, doc.data().subStep2];
        });
        displayedElements = elementsData;
        displayElements();
    }

    fetchElements();

    let elementsData = {};
    let displayedElements = {};
    const chunkSize = 350; // Number of elements to process at a time

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    elementsData = JSON.parse(e.target.result);
                    displayedElements = elementsData;
                    displayElements();
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

    function displayElements() {
        const elementsContainer = document.getElementById('elementsContainer');
        elementsContainer.innerHTML = '';
        let keys = Object.keys(displayedElements).sort((a, b) => displayedElements[a][1].localeCompare(displayedElements[b][1]));
        renderElementsChunk(keys, 0);
    }

    function renderElementsChunk(keys, start) {
        const elementsContainer = document.getElementById('elementsContainer');
        const end = Math.min(start + chunkSize, keys.length);

        for (let i = start; i < end; i++) {
            const key = keys[i];
            const element = displayedElements[key];
            const elementDiv = document.createElement('div');
            elementDiv.className = 'element';
            elementDiv.innerHTML = `<div>${element[0]}</div><div>${element[1]}</div>`;
            elementDiv.addEventListener('click', () => showGuide(key));
            elementsContainer.appendChild(elementDiv);
        }

        if (end < keys.length) {
            setTimeout(() => renderElementsChunk(keys, end), 0);
        }
    }

    function showGuide(elementKey) {
        const guideContainer = document.getElementById('guideContainer');
        guideContainer.innerHTML = '';
        const steps = [];
        gatherSteps(elementKey, steps, new Set());
        steps.forEach((step, index) => {
            const guideStep = document.createElement('div');
            guideStep.className = 'guide-step';
            guideStep.innerHTML = `<p>Step ${index + 1}: ${step}</p>`;
            guideContainer.appendChild(guideStep);
        });
        guideContainer.style.display = 'block';
    }

    function gatherSteps(elementKey, steps, seen) {
        if (seen.has(elementKey) || !elementsData[elementKey]) return; // Check if element exists
        seen.add(elementKey);

        const element = elementsData[elementKey];
        if (element[2] === 1) {
            return; // Skip primary elements
        } else {
            const subStep1 = element[3];
            const subStep2 = element[4];

            if (!subStep1 || !subStep2 || !elementsData[subStep1] || !elementsData[subStep2]) return; // Check if subStep1 and subStep2 exist
            gatherSteps(subStep1, steps, seen); // Collect steps recursively
            gatherSteps(subStep2, steps, seen); // Collect steps recursively

            const stepDescription = `${elementsData[subStep1][0]} <a href="#" onclick="showGuide('${subStep1}')">${elementsData[subStep1][1]}</a> + ${elementsData[subStep2][0]} <a href="#" onclick="showGuide('${subStep2}')">${elementsData[subStep2][1]}</a> = ${element[0]} ${element[1]}`;
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
        displayElements();
    }

    function copyGuideToClipboard() {
        const guideContainer = document.getElementById('guideContainer');
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

    // Load initial data if data.json exists
    fetch('https://raw.githubusercontent.com/TrollGuyFromMars/H/main/data.json')
        .then(response => response.json())
        .then(data => {
            elementsData = data;
            displayedElements = data;
            displayElements();
        })
        .catch(error => console.error('Error loading initial data:', error));
});
