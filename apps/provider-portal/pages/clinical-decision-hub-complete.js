// Enhanced Clinical Data Model with Comprehensive Mock Data
const clinicalMessages = [
    // Critical Messages
    {
        id: 1,
        priority: 10,
        type: 'phone',
        patient: 'Maria Rodriguez',
        patientId: 'MR-2024-001',
        age: 45,
        gender: 'F',
        avatar: 'MR',
        time: '2 min ago',
        absoluteTime: '2025-01-07 09:43 AM',
        unread: true,
        preview: 'Severe chest pain radiating to left arm, SOB, diaphoresis. Started 30 min ago.',
        fullMessage: `Dr. Chen, I'm experiencing severe chest pain that started about 30 minutes ago. It feels like crushing pressure in the center of my chest and it's radiating down my left arm. I'm also feeling very short of breath and I'm sweating profusely. The pain is 9/10 and getting worse. I took an aspirin like you told me to keep on hand, but it hasn't helped. I'm really scared - should I call 911 or can you see me right away? My husband is here and can drive me.`,
        criticalFactors: ['Chest pain', 'Radiation to arm', 'SOB', 'Diaphoresis', 'Pain 9/10'],
        vitals: { 
            bp: '168/95', 
            hr: '118', 
            o2: '91%', 
            temp: '98.6°F',
            rr: '24'
        },
        pmh: ['HTN', 'T2DM', 'Hyperlipidemia', 'Family Hx CAD', 'Former smoker'],
        medications: [
            'Metformin 1000mg BID',
            'Lisinopril 20mg daily',
            'Atorvastatin 40mg HS',
            'Aspirin 81mg daily'
        ],
        allergies: ['Penicillin - rash'],
        lastVisit: '2 weeks ago - BP check',
        clinicalGuidelines: [
            'ACC/AHA: Immediate ED evaluation for suspected ACS',
            'TIMI Risk Score: 5/7 - High risk features present',
            'Door-to-balloon time critical if STEMI',
            'Activate STEMI protocol if ECG shows elevation'
        ],
        recommendedActions: [
            { action: 'Call 911 immediately', priority: 'immediate', selected: false },
            { action: 'Chew aspirin 325mg if not already taken', priority: 'immediate', selected: false },
            { action: 'Alert ED - possible incoming STEMI', priority: 'immediate', selected: false },
            { action: 'Remain calm, unlock door for EMS', priority: 'urgent', selected: false },
            { action: 'Document time of symptom onset', priority: 'urgent', selected: false }
        ],
        riskScore: 95
    },
    {
        id: 2,
        priority: 9,
        type: 'lab',
        patient: 'James Wilson',
        patientId: 'JW-2024-002',
        age: 72,
        gender: 'M',
        avatar: 'JW',
        time: '15 min ago',
        absoluteTime: '2025-01-07 09:30 AM',
        unread: true,
        preview: 'CRITICAL: K+ 6.8, Creatinine 3.2 (baseline 1.4), ECG changes noted',
        results: [
            { test: 'Potassium', value: '6.8', normal: '3.5-5.0', status: 'critical', trend: '↑↑' },
            { test: 'Creatinine', value: '3.2', normal: '0.7-1.3', status: 'critical', trend: '↑' },
            { test: 'BUN', value: '68', normal: '7-20', status: 'critical', trend: '↑' },
            { test: 'eGFR', value: '18', normal: '>60', status: 'critical', trend: '↓' },
            { test: 'Glucose', value: '142', normal: '70-100', status: 'abnormal', trend: '→' }
        ],
        pmh: ['CKD Stage 3b', 'HTN', 'T2DM', 'CHF (EF 35%)', 'Afib on warfarin'],
        medications: [
            'Lisinopril 40mg daily',
            'Spironolactone 25mg daily',
            'Metoprolol 50mg BID',
            'Furosemide 40mg BID',
            'Warfarin 5mg daily'
        ],
        ecgFindings: 'Peaked T waves, widened QRS',
        clinicalGuidelines: [
            'Hyperkalemia Protocol: K+ >6.5 requires immediate treatment',
            'Hold ACE-I, ARB, K-sparing diuretics immediately',
            'Consider calcium gluconate, insulin/glucose, kayexalate',
            'May require emergent dialysis if refractory'
        ],
        recommendedActions: [
            { action: 'Call patient immediately', priority: 'immediate', selected: false },
            { action: 'Hold ACE-I and spironolactone', priority: 'immediate', selected: false },
            { action: 'Order stat ECG', priority: 'immediate', selected: false },
            { action: 'Prepare hyperkalemia treatment', priority: 'urgent', selected: false },
            { action: 'Nephrology consult', priority: 'urgent', selected: false }
        ],
        riskScore: 90
    },
    {
        id: 3,
        priority: 8,
        type: 'imaging',
        patient: 'Susan Chen',
        patientId: 'SC-2024-003',
        age: 67,
        gender: 'F',
        avatar: 'SC',
        time: '30 min ago',
        absoluteTime: '2025-01-07 09:15 AM',
        unread: true,
        preview: 'CXR: New RLL infiltrate with pleural effusion, concern for pneumonia vs malignancy',
        results: [
            { finding: 'RLL consolidation', significance: 'New finding - concerning', action: 'Urgent follow-up' },
            { finding: 'Moderate pleural effusion', significance: 'New - needs evaluation', action: 'Consider thoracentesis' },
            { finding: 'Mediastinal lymphadenopathy', significance: 'Enlarged - 2.5cm', action: 'CT chest recommended' },
            { finding: 'Cardiomegaly', significance: 'Stable', action: 'Continue monitoring' }
        ],
        vitals: { 
            temp: '101.8°F', 
            bp: '142/88', 
            hr: '102', 
            o2: '92% on RA',
            rr: '22'
        },
        pmh: ['CHF (EF 40%)', 'HTN', 'CKD Stage 3', '30 pack-year smoking history', 'COPD'],
        symptoms: ['Productive cough x1 week', 'Hemoptysis x2 days', 'Weight loss 10lbs/month', 'Night sweats'],
        clinicalGuidelines: [
            'Fleischner Society: Solid nodule >8mm requires CT',
            'Consider malignancy in smoker with hemoptysis',
            'CURB-65 score for pneumonia severity',
            'Light\'s criteria for pleural fluid analysis'
        ],
        recommendedActions: [
            { action: 'Order CT chest with contrast', priority: 'urgent', selected: false },
            { action: 'Start empiric antibiotics', priority: 'high', selected: false },
            { action: 'Pulmonology consult', priority: 'high', selected: false },
            { action: 'Consider thoracentesis', priority: 'medium', selected: false },
            { action: 'Sputum culture and cytology', priority: 'medium', selected: false }
        ],
        riskScore: 85
    }
];

// State Management
const appState = {
    expandedMessages: new Set(),
    selectedActions: {},
    composedResponses: {},
    currentFilter: { type: 'priority', value: 'all' },
    currentView: 'priority',
    searchTerm: '',
    selectedMessageId: null,
    theme: localStorage.getItem('theme') || 'light',
    summaryTab: 'overview'
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Set initial theme
    document.documentElement.setAttribute('data-theme', appState.theme);
    updateThemeIcon();
    
    // Render initial content
    renderMessages();
    updateSummaryPanel();
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Initialize real-time updates simulation
    startRealTimeUpdates();
}

// Render Messages
function renderMessages() {
    const container = document.getElementById('messageList');
    if (!container) return;
    
    container.innerHTML = '';

    // Filter and sort messages
    let filteredMessages = filterMessages(clinicalMessages);
    filteredMessages = sortMessages(filteredMessages);

    // Render each message
    filteredMessages.forEach(msg => {
        container.appendChild(createMessageCard(msg));
    });

    // Update counts
    updateFilterCounts();
}

// Filter messages based on current filters
function filterMessages(messages) {
    let filtered = [...messages];

    // Apply search filter
    if (appState.searchTerm) {
        const searchLower = appState.searchTerm.toLowerCase();
        filtered = filtered.filter(msg => 
            msg.patient.toLowerCase().includes(searchLower) ||
            msg.preview.toLowerCase().includes(searchLower) ||
            (msg.fullMessage && msg.fullMessage.toLowerCase().includes(searchLower))
        );
    }

    // Apply type/priority filters
    const { type, value } = appState.currentFilter;
    
    if (type === 'priority' && value !== 'all') {
        if (value === 'critical') {
            filtered = filtered.filter(msg => msg.priority >= 8);
        } else if (value === 'high') {
            filtered = filtered.filter(msg => msg.priority >= 6 && msg.priority < 8);
        } else if (value === 'medium') {
            filtered = filtered.filter(msg => msg.priority >= 4 && msg.priority < 6);
        } else if (value === 'low') {
            filtered = filtered.filter(msg => msg.priority < 4);
        }
    } else if (type === 'type' && value !== 'all') {
        filtered = filtered.filter(msg => msg.type === value);
    }

    return filtered;
}

// Sort messages based on current view
function sortMessages(messages) {
    const sorted = [...messages];
    
    if (appState.currentView === 'priority') {
        sorted.sort((a, b) => b.priority - a.priority);
    } else if (appState.currentView === 'timeline') {
        sorted.sort((a, b) => parseMessageTime(a.time) - parseMessageTime(b.time));
    } else if (appState.currentView === 'patient') {
        sorted.sort((a, b) => a.patient.localeCompare(b.patient));
    }
    
    return sorted;
}

// Parse message time to Date object
function parseMessageTime(timeStr) {
    const now = new Date();
    if (timeStr.includes('min ago')) {
        const mins = parseInt(timeStr);
        return new Date(now - mins * 60000);
    } else if (timeStr.includes('hour')) {
        const hours = parseFloat(timeStr);
        return new Date(now - hours * 3600000);
    }
    return now;
}

// Create Message Card
function createMessageCard(msg) {
    const card = document.createElement('div');
    card.className = `message-card ${getPriorityClass(msg.priority)} ${msg.unread ? 'unread' : ''}`;
    card.dataset.messageId = msg.id;

    const layout = document.createElement('div');
    layout.className = 'msg-layout';
    layout.onclick = () => toggleExpanded(msg.id);

    // Priority indicator
    const priorityDiv = document.createElement('div');
    priorityDiv.className = 'msg-priority';
    priorityDiv.innerHTML = `
        <div class="priority-score ${getScoreClass(msg.priority)}">${msg.priority}</div>
        <div class="msg-type-icon">${getTypeLabel(msg.type)}</div>
    `;

    // Content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';
    contentDiv.innerHTML = `
        <div class="msg-header-row">
            <div class="patient-info">
                <div class="patient-avatar">${msg.avatar}</div>
                <div>
                    <div class="patient-name">${msg.patient}</div>
                    <div class="patient-details">${msg.age}${msg.gender} • ID: ${msg.patientId}</div>
                </div>
            </div>
            <div class="msg-meta">
                <span class="meta-tag tag-${msg.type}">${msg.type.toUpperCase()}</span>
                ${msg.newDiagnosis ? '<span class="meta-tag" style="background: #fee2e2; color: #dc2626;">NEW DX</span>' : ''}
                ${msg.criticalFactors ? '<span class="meta-tag" style="background: #dc2626; color: white;">CRITICAL</span>' : ''}
            </div>
        </div>
        <div class="msg-preview">${msg.preview}</div>
        <div class="msg-indicators">
            <span class="indicator ai-ready">🤖 AI Analysis Ready</span>
            ${msg.clinicalGuidelines ? '<span class="indicator">📋 Guidelines Available</span>' : ''}
            ${msg.priority > 6 ? '<span class="indicator needs-review">⚠️ Needs Review</span>' : ''}
        </div>
    `;

    // Quick actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'msg-quick-actions';
    actionsDiv.innerHTML = `
        <div class="time-info">
            <div class="time-relative">${msg.time}</div>
            <div class="time-absolute">${msg.absoluteTime}</div>
        </div>
        <div class="quick-btns">
            ${msg.priority > 7 ? `<button class="quick-btn primary" onclick="quickAction(event, ${msg.id}, 'urgent')">Urgent</button>` : ''}
            <button class="quick-btn" onclick="quickAction(event, ${msg.id}, 'review')">Review</button>
            <button class="quick-btn" onclick="quickAction(event, ${msg.id}, 'defer')">Defer</button>
        </div>
    `;

    layout.appendChild(priorityDiv);
    layout.appendChild(contentDiv);
    layout.appendChild(actionsDiv);

    // Expanded detail
    const detail = createExpandedDetail(msg);

    card.appendChild(layout);
    card.appendChild(detail);

    return card;
}

// Create Expanded Detail
function createExpandedDetail(msg) {
    const detail = document.createElement('div');
    detail.className = 'clinical-detail';
    detail.id = `detail-${msg.id}`;

    let html = '<div class="detail-content">';

    // Patient Message/Content
    if (msg.fullMessage) {
        html += createPatientMessage(msg);
    }

    // Clinical Context
    html += createClinicalContext(msg);

    // Results Display
    if (msg.results) {
        html += createResultsDisplay(msg);
    }

    // Guidelines
    if (msg.clinicalGuidelines) {
        html += createGuidelinesPanel(msg);
    }

    // Decision Support
    html += createDecisionSupport(msg);

    // Action Builder
    html += createActionBuilder(msg);

    html += '</div>';
    detail.innerHTML = html;

    return detail;
}

// Create Patient Message Display
function createPatientMessage(msg) {
    const html = `
        <div class="patient-message">
            <div class="patient-message-header">
                💬 Patient Message
            </div>
            <div class="patient-message-content">
                ${msg.fullMessage}
            </div>
            ${msg.criticalFactors || msg.vitals ? `
                <div class="message-metadata">
                    ${msg.vitals ? Object.entries(msg.vitals).map(([k, v]) => 
                        `<span><strong>${k.toUpperCase()}:</strong> ${v}</span>`
                    ).join('') : ''}
                    ${msg.criticalFactors ? `<span><strong>Red Flags:</strong> ${msg.criticalFactors.join(', ')}</span>` : ''}
                </div>
            ` : ''}
        </div>
    `;
    
    return html;
}

// Clinical Context Panel
function createClinicalContext(msg) {
    let html = '<div class="context-grid">';
    
    html += `
        <div class="context-item">
            <div class="context-label">Age/Gender</div>
            <div class="context-value">${msg.age}${msg.gender}</div>
        </div>
    `;

    if (msg.pmh && msg.pmh.length > 0) {
        html += `
            <div class="context-item">
                <div class="context-label">PMH</div>
                <div class="context-value">${msg.pmh.join(', ')}</div>
            </div>
        `;
    }

    if (msg.medications && msg.medications.length > 0) {
        html += `
            <div class="context-item">
                <div class="context-label">Current Meds</div>
                <div class="context-value">${msg.medications.length} active</div>
            </div>
        `;
    }

    if (msg.allergies) {
        html += `
            <div class="context-item">
                <div class="context-label">Allergies</div>
                <div class="context-value warning">${msg.allergies.join(', ')}</div>
            </div>
        `;
    }

    if (msg.vitals) {
        Object.entries(msg.vitals).forEach(([key, value]) => {
            const status = checkVitalStatus(key, value);
            html += `
                <div class="context-item">
                    <div class="context-label">${key.toUpperCase()}</div>
                    <div class="context-value ${status}">${value}</div>
                </div>
            `;
        });
    }

    html += '</div>';
    return html;
}

// Results Display
function createResultsDisplay(msg) {
    let html = '<div class="results-grid">';

    if (msg.type === 'lab' && msg.results) {
        msg.results.forEach(result => {
            const isAbnormal = result.status === 'critical' || result.status === 'abnormal';
            html += `
                <div class="result-card ${isAbnormal ? 'critical' : ''}">
                    <div class="result-name">${result.test}</div>
                    <div class="result-value ${result.status}">${result.value}</div>
                    <div class="result-meta">
                        <span>${result.normal || ''}</span>
                        <span class="result-trend">${result.trend || ''}</span>
                    </div>
                </div>
            `;
        });
    } else if (msg.type === 'imaging' && msg.results) {
        msg.results.forEach(finding => {
            html += `
                <div class="result-card">
                    <div class="result-name">${finding.finding}</div>
                    <div class="result-value" style="font-size: 12px;">${finding.significance}</div>
                    <div class="result-meta">
                        <span>Action: ${finding.action}</span>
                    </div>
                </div>
            `;
        });
    }

    html += '</div>';
    return html;
}

// Guidelines Panel
function createGuidelinesPanel(msg) {
    let html = '<div class="guidelines-panel">';
    html += '<div class="guidelines-header">📋 Clinical Guidelines</div>';
    
    msg.clinicalGuidelines.forEach(guideline => {
        html += `<div class="guideline-item">${guideline}</div>`;
    });

    html += '</div>';
    return html;
}

// Decision Support Panel
function createDecisionSupport(msg) {
    let html = '<div class="decision-support">';
    html += '<div class="ds-header">🧭 Clinical Decision Support</div>';
    html += '<div class="ds-content">';

    msg.recommendedActions.forEach((action, idx) => {
        const selected = appState.selectedActions[msg.id]?.[idx] || false;
        html += `
            <div class="ds-item ${selected ? 'selected' : ''}" 
                 onclick="toggleAction(${msg.id}, ${idx})">
                <div class="ds-title">${action.action}</div>
                <div class="ds-detail">Priority: ${action.priority}</div>
            </div>
        `;
    });

    html += '</div></div>';
    return html;
}

// Action Builder
function createActionBuilder(msg) {
    let html = '<div class="action-builder">';
    
    html += `
        <div class="builder-tabs">
            <button class="builder-tab active" onclick="switchTab(${msg.id}, 'response')">Response</button>
            <button class="builder-tab" onclick="switchTab(${msg.id}, 'orders')">Orders</button>
            <button class="builder-tab" onclick="switchTab(${msg.id}, 'referrals')">Referrals</button>
            <button class="builder-tab" onclick="switchTab(${msg.id}, 'follow-up')">Follow-up</button>
            <button class="builder-tab" onclick="switchTab(${msg.id}, 'documentation')">Documentation</button>
        </div>
    `;

    html += `<div class="action-options" id="action-options-${msg.id}">`;
    html += createResponseOptions(msg);
    html += '</div>';

    const savedResponse = appState.composedResponses[msg.id] || '';
    html += `
        <div class="composed-action" 
             id="composed-${msg.id}" 
             contenteditable="true" 
             placeholder="Compose your clinical response and actions..."
             onblur="saveComposedResponse(${msg.id})">${savedResponse}</div>
    `;

    html += `
        <div class="action-controls">
            <button class="action-ctrl ctrl-ai" onclick="generateAIResponse(${msg.id})">
                <span>🤖</span> AI Suggest
            </button>
            <button class="action-ctrl ctrl-execute" onclick="executeAction(${msg.id})">
                <span>✓</span> Execute & Send
            </button>
            <button class="action-ctrl ctrl-save" onclick="saveAction(${msg.id})">
                <span>💾</span> Save Draft
            </button>
            <button class="action-ctrl ctrl-defer" onclick="deferAction(${msg.id})">
                <span>⏰</span> Defer
            </button>
        </div>
    `;

    html += '</div>';
    return html;
}

// Create Response Options
function createResponseOptions(msg) {
    const templates = getResponseTemplates(msg);
    let html = '';

    templates.forEach((template) => {
        html += `
            <div class="action-opt" onclick="addToComposed(${msg.id}, '${template.text.replace(/'/g, "\\'")}')">
                ${template.label}
            </div>
        `;
    });

    return html;
}

// Get Response Templates based on message type and priority
function getResponseTemplates(msg) {
    const baseTemplates = [
        { label: 'Acknowledge', text: 'I have reviewed your message. ' },
        { label: 'Schedule Visit', text: 'Please schedule an appointment to discuss this further. ' }
    ];

    if (msg.priority >= 8) {
        return [
            { label: 'Urgent Action', text: 'This requires immediate attention. ' },
            { label: 'ED Referral', text: 'Please go to the emergency department immediately. ' },
            { label: 'Call 911', text: 'Please call 911 immediately for emergency medical attention. ' },
            ...baseTemplates
        ];
    } else if (msg.type === 'lab') {
        return [
            { label: 'Results Reviewed', text: 'I have reviewed your lab results. ' },
            { label: 'Medication Adjustment', text: 'Based on your results, I am adjusting your medications. ' },
            { label: 'Lifestyle Changes', text: 'These results indicate we should discuss lifestyle modifications. ' },
            ...baseTemplates
        ];
    } else if (msg.type === 'imaging') {
        return [
            { label: 'Imaging Reviewed', text: 'I have reviewed your imaging results. ' },
            { label: 'Additional Imaging', text: 'I am ordering additional imaging for further evaluation. ' },
            { label: 'Specialist Referral', text: 'I am referring you to a specialist for further evaluation. ' },
            ...baseTemplates
        ];
    }

    return baseTemplates;
}

// Helper Functions
function getPriorityClass(priority) {
    if (priority >= 8) return 'critical';
    if (priority >= 5) return 'warning';
    return 'routine';
}

function getScoreClass(priority) {
    if (priority >= 8) return 'score-high';
    if (priority >= 5) return 'score-medium';
    return 'score-low';
}

function getTypeLabel(type) {
    const labels = {
        phone: 'PHONE',
        email: 'EMAIL',
        lab: 'LAB',
        imaging: 'IMAGING',
        provider: 'PROVIDER',
        staff: 'STAFF',
        refill: 'REFILL',
        consult: 'CONSULT'
    };
    return labels[type] || type.toUpperCase();
}

function checkVitalStatus(key, value) {
    const numValue = parseFloat(value);
    
    if (key === 'bp') {
        const systolic = parseInt(value.split('/')[0]);
        if (systolic > 140) return 'abnormal';
        if (systolic > 130) return 'warning';
    } else if (key === 'hr') {
        if (numValue < 60 || numValue > 100) return 'warning';
        if (numValue < 50 || numValue > 120) return 'abnormal';
    } else if (key === 'o2') {
        if (numValue < 95) return 'warning';
        if (numValue < 90) return 'abnormal';
    } else if (key === 'temp') {
        if (numValue > 100.4) return 'warning';
        if (numValue > 102) return 'abnormal';
    }
    
    return 'normal';
}

// Event Handlers
function toggleExpanded(msgId) {
    const detail = document.getElementById(`detail-${msgId}`);
    if (!detail) return;
    
    if (appState.expandedMessages.has(msgId)) {
        appState.expandedMessages.delete(msgId);
        detail.classList.remove('open');
    } else {
        appState.expandedMessages.add(msgId);
        detail.classList.add('open');
        
        // Mark as read
        const msg = clinicalMessages.find(m => m.id === msgId);
        if (msg) msg.unread = false;
        
        // Update selected message
        appState.selectedMessageId = msgId;
    }
}

function quickAction(event, msgId, action) {
    event.stopPropagation();
    
    if (action === 'urgent') {
        showNotification(`Urgent protocol initiated for message ${msgId}`, 'warning');
    } else if (action === 'review') {
        const msg = clinicalMessages.find(m => m.id === msgId);
        if (msg) msg.unread = false;
        renderMessages();
        showNotification('Message marked as reviewed', 'success');
    } else if (action === 'defer') {
        showNotification('Message deferred for later review', 'info');
    }
}

function toggleAction(msgId, actionIdx) {
    if (!appState.selectedActions[msgId]) {
        appState.selectedActions[msgId] = {};
    }
    
    appState.selectedActions[msgId][actionIdx] = !appState.selectedActions[msgId][actionIdx];
    
    // Re-render the decision support panel
    const msg = clinicalMessages.find(m => m.id === msgId);
    if (msg) {
        const detail = document.getElementById(`detail-${msgId}`);
        if (detail) {
            const dsElement = detail.querySelector('.decision-support');
            if (dsElement) {
                dsElement.outerHTML = createDecisionSupport(msg);
            }
        }
        
        // Add to composed response
        if (appState.selectedActions[msgId][actionIdx]) {
            addToComposed(msgId, msg.recommendedActions[actionIdx].action + '. ');
        }
    }
}

function addToComposed(msgId, text) {
    const composed = document.getElementById(`composed-${msgId}`);
    if (composed) {
        composed.textContent += text;
        saveComposedResponse(msgId);
    }
}

function saveComposedResponse(msgId) {
    const composed = document.getElementById(`composed-${msgId}`);
    if (composed) {
        appState.composedResponses[msgId] = composed.textContent;
    }
}

function switchTab(msgId, tab) {
    // Update active tab
    const tabs = document.querySelectorAll(`#detail-${msgId} .builder-tab`);
    tabs.forEach(t => {
        t.classList.remove('active');
        if (t.textContent.toLowerCase().includes(tab)) {
            t.classList.add('active');
        }
    });
    
    // Update options
    const optionsDiv = document.getElementById(`action-options-${msgId}`);
    if (!optionsDiv) return;
    
    if (tab === 'orders') {
        optionsDiv.innerHTML = `
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order CBC with differential. ')">CBC</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order comprehensive metabolic panel. ')">CMP</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order hemoglobin A1C. ')">A1C</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order lipid panel. ')">Lipids</div>
            <div class="action-opt"
