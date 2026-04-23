import { Project } from '../types';
import { Mission } from '../types';
import { DEFAULT_GEMINI_TARGET_MODEL } from '../utils/missionTarget';

// ─── ShopAssist AI — Demo Project ────────────────────────────────────────────
// Shown to first-time users so they have a working example right away.
// Uses mock URLs so no real system is needed.

const MOCK_API = {
    post_url: 'https://api.stylemart-demo.com/v1/chat',
    get_url: 'https://api.stylemart-demo.com/v1/chat/history/{{phone_number}}',
    auth_header: 'Bearer demo-token-stylemart',
    payload_template: '{"customerId": "{{phone_number}}", "message": "{{message}}", "sessionId": "test-{{wamid}}"}',
    response_path: 'data.messages',
    polling_interval: 2000,
    max_timeout: 45,
    headers: {},
};

export const seedProject: Project = {
    id: 'demo-shopassist-001',
    name: 'ShopAssist AI (Demo)',
    description: 'E-commerce customer support assistant. Handles order tracking, returns, product questions, and escalations. — Demo project, safe to delete.',
    documentation: `# ShopAssist AI

## Product Vision
ShopAssist AI is a conversational customer support assistant for mid-size e-commerce brands. It reduces support ticket volume by resolving the most common post-purchase questions instantly via chat — without requiring a human agent.

## What the System Does

### Order Management
- Customers can inquire about their order status using an order number
- The assistant retrieves real-time shipping and delivery information
- Supports order cancellation (only before dispatch)

### Returns & Refunds
- Guides customers through the return eligibility check (30-day policy)
- Initiates return requests and generates prepaid shipping labels
- Tracks refund status (3-5 business days for card refunds, instant for store credit)

### Product Support
- Answers questions about sizing, availability, and specifications
- Recommends alternatives if a product is out of stock
- Handles complaints and warranty inquiries

### Escalation
- Detects frustration signals in conversation (repeated complaints, explicit requests for a human)
- Escalates to a live agent ticket with full conversation context attached
- Always informs the customer when escalation happens and provides a ticket number

## Agent Behavior Rules — Important for Testing

- The assistant **must never fabricate order data** — if an order is not found, it says so and asks for the correct number
- Returns are **only accepted within 30 days** of delivery date — the assistant must check and decline politely if outside window
- Before cancelling an order, the assistant **must confirm** with the customer
- The assistant should **detect when a customer is upset** and proactively offer escalation
- All monetary amounts must be stated clearly with currency (USD)
- The assistant **must not promise delivery dates** it cannot verify — use "estimated" language

## Scope (Not Yet Available)
- Live inventory checks (product availability is simulated)
- Payment method changes after order placement
- Real-time chat handoff (escalation creates a ticket, not instant transfer)`,
    target_provider: 'http',
    target_gemini_model: DEFAULT_GEMINI_TARGET_MODEL,
    system_prompts: [
        {
            id: 'sp-shop-general',
            name: 'General Support',
            content: 'You are ShopAssist, a friendly e-commerce support assistant for StyleMart. You help customers with orders, returns, and product questions. Route to the appropriate flow based on intent. Always be concise, empathetic, and professional. If a customer is clearly upset or requests a human agent, escalate immediately.',
        },
        {
            id: 'sp-shop-orders',
            name: 'Order Management',
            content: 'You handle order tracking and cancellations for StyleMart. Ask for the order number if not provided. Look up the order and report: status, estimated delivery, tracking number. For cancellation requests, confirm before proceeding. Never cancel orders already dispatched — offer a return instead.',
        },
        {
            id: 'sp-shop-returns',
            name: 'Returns & Refunds',
            content: 'You handle returns and refunds for StyleMart. Check if the order is within the 30-day return window. If eligible, initiate the return, generate a prepaid label, and inform refund timeline (3-5 days for card, instant for store credit). If outside window, apologize and explain the policy clearly.',
        },
    ],
    environments: [
        {
            id: 'demo-env-mock',
            name: 'Demo (Mock API)',
            api_config: MOCK_API,
        },
    ],
};

export const seedMissions: Mission[] = [
    {
        id: 'demo-m-001',
        titulo: 'Order Status Inquiry — Happy Path',
        project_id: 'demo-shopassist-001',
        environment_id: 'demo-env-mock',
        system_prompt_id: 'sp-shop-orders',
        target_system_prompt: 'You handle order tracking and cancellations for StyleMart. Ask for the order number if not provided. Look up the order and report: status, estimated delivery, tracking number. For cancellation requests, confirm before proceeding. Never cancel orders already dispatched — offer a return instead.',
        tester_persona: 'You are {{contact_name}}, a regular online shopper who placed an order 3 days ago and wants to know where it is. You\'re friendly but slightly impatient. If asked for your order number, provide: ORD-2024-{{order_id}}.',
        mission_goal: 'Verify that the assistant correctly handles an order status request: asks for the order number if not provided, retrieves shipping info, and presents it clearly without fabricating details.',
        variables: {
            contact_name: ['Sarah Johnson', 'Mike Chen', 'Emma Davis'],
            order_id: ['45821', '67234', '89103'],
            phone_number: ['15550001234'],
        },
        max_turns: 6,
        api_config: MOCK_API,
        evaluation_criteria: [
            { id: 'ec-dm001-1', name: 'Order Number Collection', description: 'Did the assistant ask for the order number if not initially provided?' },
            { id: 'ec-dm001-2', name: 'Accurate Information', description: 'Was the order status, ETA and tracking number presented clearly?' },
            { id: 'ec-dm001-3', name: 'No Fabrication', description: 'Did the assistant avoid inventing data it could not verify?' },
            { id: 'ec-dm001-4', name: 'Response Efficiency', description: 'Was the resolution achieved in 3 or fewer turns?' },
        ],
    },
    {
        id: 'demo-m-002',
        titulo: 'Return Request — Within Policy Window',
        project_id: 'demo-shopassist-001',
        environment_id: 'demo-env-mock',
        system_prompt_id: 'sp-shop-returns',
        target_system_prompt: 'You handle returns and refunds for StyleMart. Check if the order is within the 30-day return window. If eligible, initiate the return, generate a prepaid label, and inform refund timeline (3-5 days for card, instant for store credit). If outside window, apologize and explain the policy clearly.',
        tester_persona: 'You are {{contact_name}}, who bought a jacket 12 days ago and it doesn\'t fit. You want to return it for a full refund. Order: ORD-2024-78523. Be cooperative and provide info when asked.',
        mission_goal: 'Verify the return flow: assistant checks eligibility (within 30 days ✓), initiates the return, offers refund options (card vs store credit), generates a shipping label, and confirms timeline.',
        variables: {
            contact_name: ['Sarah Johnson', 'Alex Turner'],
            phone_number: ['15550001234'],
        },
        max_turns: 8,
        api_config: MOCK_API,
        evaluation_criteria: [
            { id: 'ec-dm002-1', name: 'Eligibility Check', description: 'Did the assistant verify the 30-day policy before initiating the return?' },
            { id: 'ec-dm002-2', name: 'Refund Options Offered', description: 'Were both refund methods (card / store credit) presented?' },
            { id: 'ec-dm002-3', name: 'Label & Timeline', description: 'Was the prepaid label and refund timeline (3-5 days) communicated?' },
            { id: 'ec-dm002-4', name: 'Empathy', description: 'Was the tone empathetic given the customer\'s inconvenience?' },
        ],
    },
    {
        id: 'demo-m-003',
        titulo: 'Invalid Order Number Handling',
        project_id: 'demo-shopassist-001',
        environment_id: 'demo-env-mock',
        system_prompt_id: 'sp-shop-orders',
        target_system_prompt: 'You handle order tracking and cancellations for StyleMart. Ask for the order number if not provided. Look up the order and report: status, estimated delivery, tracking number. For cancellation requests, confirm before proceeding. Never cancel orders already dispatched — offer a return instead.',
        tester_persona: 'You are {{contact_name}}, who types the wrong order number first (ORD-WRONG-9999). When the assistant can\'t find it, you check again and provide the correct one: ORD-2024-45812.',
        mission_goal: 'Verify error handling: assistant reports the order not found without fabricating data, asks the customer to verify, and successfully retrieves the correct order on the second attempt.',
        variables: {
            contact_name: ['James Wilson', 'Lisa Park'],
            phone_number: ['15550001234'],
        },
        max_turns: 6,
        api_config: MOCK_API,
        evaluation_criteria: [
            { id: 'ec-dm003-1', name: 'No Fabrication on Error', description: 'Did the assistant refuse to invent data for the invalid order number?' },
            { id: 'ec-dm003-2', name: 'Clear Error Message', description: 'Was the \'not found\' message clear and did it suggest what to do next?' },
            { id: 'ec-dm003-3', name: 'Recovery', description: 'Did the assistant successfully resolve the inquiry after the correct number was provided?' },
        ],
    },
    {
        id: 'demo-m-004',
        titulo: 'Frustrated Customer — Escalation Detection',
        project_id: 'demo-shopassist-001',
        environment_id: 'demo-env-mock',
        system_prompt_id: 'sp-shop-general',
        target_system_prompt: 'You are ShopAssist, a friendly e-commerce support assistant for StyleMart. You help customers with orders, returns, and product questions. Route to the appropriate flow based on intent. Always be concise, empathetic, and professional. If a customer is clearly upset or requests a human agent, escalate immediately.',
        tester_persona: 'You are {{contact_name}}, extremely frustrated. Your package is 10 days late and the tracking hasn\'t updated in a week. Start politely but escalate your tone after the first response. Eventually say \'I want to speak to a real person right now.\'',
        mission_goal: 'Verify escalation detection: assistant recognizes frustration signals, offers proactive de-escalation, and correctly escalates to a human ticket with a ticket number when explicitly requested.',
        variables: {
            contact_name: ['David Brown', 'Rachel Kim'],
            phone_number: ['15550001234'],
        },
        max_turns: 10,
        api_config: MOCK_API,
        evaluation_criteria: [
            { id: 'ec-dm004-1', name: 'Frustration Recognition', description: 'Did the assistant acknowledge and validate the customer\'s frustration?' },
            { id: 'ec-dm004-2', name: 'Escalation Triggered', description: 'Was escalation offered proactively OR triggered immediately on explicit request?' },
            { id: 'ec-dm004-3', name: 'Ticket Number Provided', description: 'Was a ticket number given to the customer after escalation?' },
            { id: 'ec-dm004-4', name: 'Tone Management', description: 'Did the assistant remain calm and professional throughout the interaction?' },
        ],
    },
    {
        id: 'demo-m-005',
        titulo: 'Return Request — Outside 30-Day Window',
        project_id: 'demo-shopassist-001',
        environment_id: 'demo-env-mock',
        system_prompt_id: 'sp-shop-returns',
        target_system_prompt: 'You handle returns and refunds for StyleMart. Check if the order is within the 30-day return window. If eligible, initiate the return, generate a prepaid label, and inform refund timeline (3-5 days for card, instant for store credit). If outside window, apologize and explain the policy clearly.',
        tester_persona: 'You are {{contact_name}}, trying to return a pair of shoes bought 45 days ago. Order: ORD-2024-31190. You\'ll push back once when told you\'re outside the return window.',
        mission_goal: 'Verify policy enforcement: assistant checks the purchase date, correctly identifies it\'s outside the 30-day window, declines the return politely, explains the policy clearly, and remains firm but kind when the customer pushes back.',
        variables: {
            contact_name: ['Tom Martinez', 'Grace Lee'],
            phone_number: ['15550001234'],
        },
        max_turns: 6,
        api_config: MOCK_API,
        evaluation_criteria: [
            { id: 'ec-dm005-1', name: 'Policy Enforcement', description: 'Did the assistant correctly decline the return as outside the 30-day window?' },
            { id: 'ec-dm005-2', name: 'Clear Explanation', description: 'Was the policy explained clearly with the specific reason for denial?' },
            { id: 'ec-dm005-3', name: 'Firmness with Empathy', description: 'Did the assistant hold the policy while remaining empathetic when pushed back?' },
        ],
    },
];
