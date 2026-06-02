import { AssignmentListItem } from '../types/assignments.types';

export interface MockPart {
  id: string;
  orderId: string;
  partNumber: string;
  quantity: number;
  brand: string;
  partType: 'ordered' | 'in-hand';
  itemDescription: string;
  imageUrl?: string;
  orderNo: string;
  isDraft: boolean;
  status: string;
  trackingNumber?: string;
  carrier?: string;
  price?: number;
  date?: string;
}

export interface MockReview {
  id: string;
  customerName: string;
  rating: number;
  date: string;
  comment: string;
  appliance: string;
}

// Helper to get dates relative to today for dynamic mocking
const getRelativeDateStr = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const getRelativeDateTimeStr = (offsetDays: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

// Initial assignments matching mobile screens exactly
export const initialAssignments: any[] = [
  {
    id: '593',
    soNumber: 'SO-593',
    status: 'assigned',
    scheduledDate: '2026-06-02',
    scheduledArrival: '2026-06-02T08:30:00.000Z',
    assignedAt: '2026-06-01T12:00:00.000Z',
    job: {
      id: 'job-1',
      soNumber: 'SO-593',
      customerName: 'Joe Matteo',
      customerPhone: '856-313-2408',
      customerAddress: '3333 Beverly Rd',
      customerCity: 'Hoffman Estates',
      customerState: 'IL',
      customerZip: '60179',
      scheduledDate: '2026-06-02',
      scheduledTimeWindow: '8:30 AM - 12:30 PM',
      applianceType: 'Refrigeration',
      manufacturerBrand: 'KENMORE',
      applianceModel: '795.72053.110',
      applianceSerial: '8841-A',
      serviceDescription: 'Customer reports the fridge compartment is not cooling correctly. Constant humming sound coming from the rear panel. Ice maker is jammed and water dispenser is dripping intermittently. Required diagnostics on compressor and fan motor.',
      priority: true,
    },
    guidelines: [
      { id: '1', text: 'Pre-call customer 30 mins prior', subtext: 'Confirm someone 18+ is present', checked: false },
      { id: '2', text: 'Verify serial number upon arrival', subtext: 'Check for physical exterior damage', checked: false },
      { id: '3', text: 'Photo of internal components', subtext: 'Mandatory for all 1099 partners', checked: false },
    ],
    parts: []
  },
  {
    id: '812',
    soNumber: 'SO-812',
    status: 'arrived',
    scheduledDate: '2026-06-02',
    scheduledArrival: '2026-06-02T11:15:00.000Z',
    assignedAt: '2026-06-01T12:00:00.000Z',
    job: {
      id: 'job-2',
      soNumber: 'SO-812',
      customerName: 'Sarah Jenkins',
      customerPhone: '856-555-0199',
      customerAddress: '452 Poplar Ave',
      customerCity: 'Hoffman Estates',
      customerState: 'IL',
      customerZip: '60169',
      scheduledDate: '2026-06-02',
      scheduledTimeWindow: '11:15 AM - 3:15 PM',
      applianceType: 'Washer',
      manufacturerBrand: 'SAMSUNG',
      applianceModel: 'WF45R6100AP',
      applianceSerial: 'V892-X',
      serviceDescription: 'Drain pump issue. Washer leaves clothes soaking wet and water pools inside the drum. Intermittent grinding noise during spin cycle.',
      priority: false,
    },
    guidelines: [
      { id: '1', text: 'Introduce yourself', subtext: 'Greet client politely', checked: true },
      { id: '2', text: 'Wear shoe covers', subtext: 'Before entering premises', checked: true },
      { id: '3', text: 'Explain diagnosis and repair plan', checked: false },
      { id: '4', text: 'Take before/after photos', checked: false },
      { id: '5', text: 'Clean work area', checked: false },
    ],
    parts: []
  },
  {
    id: '924',
    soNumber: 'SO-924',
    status: 'assigned',
    scheduledDate: '2026-06-02',
    scheduledArrival: '2026-06-02T14:30:00.000Z',
    assignedAt: '2026-06-01T12:00:00.000Z',
    job: {
      id: 'job-3',
      soNumber: 'SO-924',
      customerName: 'Michael Scott',
      customerPhone: '570-555-0155',
      customerAddress: '1200 Algonquin Rd',
      customerCity: 'Schaumburg',
      customerState: 'IL',
      customerZip: '60173',
      scheduledDate: '2026-06-02',
      scheduledTimeWindow: '2:30 PM - 6:30 PM',
      applianceType: 'Oven',
      manufacturerBrand: 'WHIRLPOOL',
      applianceModel: 'WFE505W0JS',
      applianceSerial: '4421-P',
      serviceDescription: 'Heating element not warming up properly. Oven takes over an hour to reach 350 degrees.',
      priority: false,
    },
    guidelines: [
      { id: '1', text: 'Introduce yourself', checked: false },
      { id: '2', text: 'Explain diagnosis and repair plan', checked: false },
    ],
    parts: []
  },
  {
    id: '551',
    soNumber: 'SO-551',
    status: 'assigned',
    scheduledDate: '2026-06-03',
    scheduledArrival: '2026-06-03T10:00:00.000Z',
    assignedAt: '2026-06-02T12:00:00.000Z',
    job: {
      id: 'job-4',
      soNumber: 'SO-551',
      customerName: 'Dwight Schrute',
      customerPhone: '570-555-0190',
      customerAddress: '1501 Woodfield Rd',
      customerCity: 'Schaumburg',
      customerState: 'IL',
      customerZip: '60173',
      scheduledDate: '2026-06-03',
      scheduledTimeWindow: '10:00 AM - 2:00 PM',
      applianceType: 'Dishwasher',
      manufacturerBrand: 'BOSCH',
      applianceModel: 'SHE3AR75UC',
      applianceSerial: '9921-A',
      serviceDescription: 'Dishwasher not draining. Standing water at the bottom after clean cycle completes.',
      priority: false,
    },
    guidelines: [
      { id: '1', text: 'Pre-call customer 30 mins prior', subtext: 'Confirm someone 18+ is present', checked: false },
      { id: '2', text: 'Verify serial number upon arrival', subtext: 'Check for physical exterior damage', checked: false },
      { id: '3', text: 'Wear shoe covers', subtext: 'Before entering premises', checked: false },
      { id: '4', text: 'Explain diagnosis and repair plan', subtext: 'Get customer approval before starting', checked: false },
    ],
    parts: []
  },
  {
    id: '320',
    soNumber: 'SO-320',
    status: 'assigned',
    scheduledDate: '2026-06-05',
    scheduledArrival: '2026-06-05T09:00:00.000Z',
    assignedAt: '2026-06-04T12:00:00.000Z',
    job: {
      id: 'job-5',
      soNumber: 'SO-320',
      customerName: 'Jim Halpert',
      customerPhone: '555-894-3201',
      customerAddress: '425 Roselle Rd',
      customerCity: 'Palatine',
      customerState: 'IL',
      customerZip: '60167',
      scheduledDate: '2026-06-05',
      scheduledTimeWindow: '9:00 AM - 1:00 PM',
      applianceType: 'Dryer',
      manufacturerBrand: 'LG',
      applianceModel: 'DLE7100W',
      applianceSerial: '7741-K',
      serviceDescription: 'Dryer tumbling but no heat. Cycles complete but clothes remain damp and cold.',
      priority: false,
    },
    guidelines: [
      { id: '1', text: 'Pre-call customer 30 mins prior', subtext: 'Confirm someone 18+ is present', checked: false },
      { id: '2', text: 'Verify serial number upon arrival', subtext: 'Check for physical exterior damage', checked: false },
      { id: '3', text: 'Wear shoe covers', subtext: 'Before entering premises', checked: false },
      { id: '4', text: 'Explain diagnosis and repair plan', subtext: 'Get customer approval before starting', checked: false },
    ],
    parts: []
  },
  {
    id: '321',
    soNumber: 'SO-321',
    status: 'assigned',
    scheduledDate: '2026-06-05',
    scheduledArrival: '2026-06-05T13:00:00.000Z',
    assignedAt: '2026-06-04T12:00:00.000Z',
    job: {
      id: 'job-6',
      soNumber: 'SO-321',
      customerName: 'Pam Beezly',
      customerPhone: '555-894-3202',
      customerAddress: '2200 E Golf Rd',
      customerCity: 'Rolling Meadows',
      customerState: 'IL',
      customerZip: '60008',
      scheduledDate: '2026-06-05',
      scheduledTimeWindow: '1:00 PM - 5:00 PM',
      applianceType: 'Refrigerator',
      manufacturerBrand: 'GE',
      applianceModel: 'GNE25JNYFS',
      applianceSerial: '1102-S',
      serviceDescription: 'Water pooling under vegetable crisper drawers. Intermittent leak from freezer door gasket.',
      priority: true,
    },
    guidelines: [
      { id: '1', text: 'Pre-call customer 30 mins prior', subtext: 'Confirm someone 18+ is present', checked: false },
      { id: '2', text: 'Verify serial number upon arrival', subtext: 'Check for physical exterior damage', checked: false },
      { id: '3', text: 'Photo of internal components', subtext: 'Mandatory for all 1099 partners', checked: false },
      { id: '4', text: 'Wear shoe covers', subtext: 'Before entering premises', checked: false },
      { id: '5', text: 'Explain diagnosis and repair plan', subtext: 'Get customer approval before starting', checked: false },
    ],
    parts: []
  }
];

export const initialAvailableJobs = [
  {
    id: 'avail-1',
    soNumber: 'SO-13799001',
    appliance: 'Dishwasher Repair',
    brand: 'KENMORE',
    address: '1501 Woodfield Rd',
    city: 'Schaumburg',
    state: 'IL',
    scheduledDate: '2026-06-03',
    scheduledTimeWindow: '8:00 AM - 12:00 PM',
    pay: 140
  },
  {
    id: 'avail-2',
    soNumber: 'SO-13799002',
    appliance: 'Dryer Heating Element Replacement',
    brand: 'WHIRLPOOL',
    address: '425 Roselle Rd',
    city: 'Palatine',
    state: 'IL',
    scheduledDate: '2026-06-03',
    scheduledTimeWindow: '12:00 PM - 4:00 PM',
    pay: 125
  },
  {
    id: 'avail-3',
    soNumber: 'SO-13799003',
    appliance: 'Oven Calibration',
    brand: 'GE PROFILE',
    address: '2200 E Golf Rd',
    city: 'Rolling Meadows',
    state: 'IL',
    scheduledDate: '2026-06-04',
    scheduledTimeWindow: '4:00 PM - 8:00 PM',
    pay: 115
  }
];

// Initial mock parts matching active / history orders
export const initialParts: MockPart[] = [
  {
    id: '812-part-1',
    orderId: 'SO-812',
    partNumber: 'DC97-17366A',
    quantity: 1,
    brand: 'SAMSUNG',
    partType: 'ordered',
    itemDescription: 'WASHER DRAIN PUMP ASSEMBLY',
    orderNo: 'ORD-812001',
    isDraft: false,
    status: 'Shipped',
    trackingNumber: '782948293849',
    carrier: 'FedEx',
    price: 52.80,
    date: '2026-05-20'
  },
  {
    id: '812-part-2',
    orderId: 'SO-812',
    partNumber: 'DC61-02595A',
    quantity: 1,
    brand: 'SAMSUNG',
    partType: 'ordered',
    itemDescription: 'WASHER FLANGE SHAFT ASSEMBLY',
    orderNo: 'ORD-812002',
    isDraft: false,
    status: 'Delivered',
    trackingNumber: '782948290094',
    carrier: 'FedEx',
    price: 85.00,
    date: '2026-05-18'
  },
  {
    id: 'active-1',
    orderId: 'SO-13600879',
    partNumber: 'WH12X10093',
    quantity: 1,
    brand: 'GE',
    partType: 'ordered',
    itemDescription: 'SWITCH ASSEMBLY CONTROL',
    orderNo: 'ORD-984029',
    isDraft: false,
    status: 'Delivered',
    trackingNumber: '782948293849',
    carrier: 'FedEx',
    price: 34.50,
    date: '2026-04-09'
  },
  {
    id: 'active-2',
    orderId: 'SO-13541483',
    partNumber: 'WH12X10093',
    quantity: 1,
    brand: 'GE',
    partType: 'ordered',
    itemDescription: 'SWITCH ASSEMBLY CONTROL',
    orderNo: 'ORD-983194',
    isDraft: false,
    status: 'Shipped',
    trackingNumber: '782948291120',
    carrier: 'FedEx',
    price: 34.50,
    date: '2026-03-25'
  },
  {
    id: 'active-3',
    orderId: 'SO-13463230',
    partNumber: 'WH01X10060',
    quantity: 2,
    brand: 'GE',
    partType: 'ordered',
    itemDescription: 'KNOB & CLIP DIAL',
    orderNo: 'ORD-982001',
    isDraft: false,
    status: 'Shipped',
    trackingNumber: '782948290094',
    carrier: 'FedEx',
    price: 12.80,
    date: '2026-03-06'
  },
  {
    id: 'hist-1',
    orderId: 'SO-13541392',
    partNumber: 'WH12X10093',
    quantity: 1,
    brand: 'GE',
    partType: 'ordered',
    itemDescription: 'SWITCH ASSEMBLY CONTROL',
    orderNo: 'ORD-983002',
    isDraft: false,
    status: 'Delivered',
    trackingNumber: '782948212320',
    carrier: 'FedEx',
    price: 34.50,
    date: '2026-03-24'
  },
  {
    id: 'hist-2',
    orderId: 'SO-13443748',
    partNumber: '5304524342',
    quantity: 1,
    brand: 'FRIGIDAIRE',
    partType: 'ordered',
    itemDescription: 'OVEN TEMPERATURE SENSOR',
    orderNo: 'ORD-981123',
    isDraft: false,
    status: 'Delivered',
    trackingNumber: '782948288212',
    carrier: 'FedEx',
    price: 45.20,
    date: '2026-02-26'
  }
];

export const initialReviews: MockReview[] = [
  {
    id: 'rev-1',
    customerName: 'Sarah Jenkins',
    rating: 5,
    date: '2026-05-18',
    comment: 'Technician arrived on time, was extremely polite, and wore shoe covers before entering. Fixed our washer in 20 minutes! Highly recommend.',
    appliance: 'Washer Repair'
  },
  {
    id: 'rev-2',
    customerName: 'David K.',
    rating: 5,
    date: '2026-05-15',
    comment: 'Very professional. Quickly diagnosed the refrigerator cooling issue, ordered the necessary fan motor, and installed it successfully.',
    appliance: 'Refrigerator Repair'
  },
  {
    id: 'rev-3',
    customerName: 'Robert Martinez',
    rating: 4,
    date: '2026-05-10',
    comment: 'Good service. The technician explained the issue clearly. Docked one star because the part delivery was delayed by a day, but the repair itself was solid.',
    appliance: 'Oven Repair'
  },
  {
    id: 'rev-4',
    customerName: 'Emily Watson',
    rating: 5,
    date: '2026-04-28',
    comment: 'Excellent work. Sasha was clean and worked fast. Fridge has been running perfectly since the visit.',
    appliance: 'Refrigerator Repair'
  }
];

export const initialNonShsJobs = [
  {
    id: 'non-shs-1',
    scheduledAt: '2026-06-02T15:00:00.000Z',
    source: 'Angi',
    appliance: 'Dryer',
    brand: 'LG',
    issue: 'Squeaking noise',
    notes: 'Customer requests call 15 mins before arrival'
  }
];

// Interactive Parts Search catalog
export const compatibleModels = [
  {
    modelNo: 'VA6013',
    brand: 'Speed Queen',
    category: 'Washing Machine',
    applianceType: 'Washer',
    imageUrl: 'https://images.unsplash.com/photo-1545173168-9f1907e80014?w=100&auto=format&fit=crop&q=60'
  }
];

export const catalogParts = [
  {
    itemId: 'part-c1',
    partNo: '13516',
    name: 'CLUTCH OIL',
    category: 'Laundry Appliances',
    description: 'CLUTCH OIL FOR SPEED QUEEN WASHERS',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=100&auto=format&fit=crop&q=60',
    price: 18.50,
    available: false // Out of stock to show screen #19 error
  },
  {
    itemId: 'part-c2',
    partNo: '13526',
    name: 'Sealant',
    category: 'Laundry Appliances',
    description: 'High temp silicone sealant tub',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&auto=format&fit=crop&q=60',
    price: 14.95,
    available: true
  },
  {
    itemId: 'part-c3',
    partNo: '14480',
    name: 'Motor Wire Harness',
    category: 'Laundry Appliances',
    description: 'Speed Queen main motor wiring assembly',
    imageUrl: 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=100&auto=format&fit=crop&q=60',
    price: 29.99,
    available: true
  }
];

// Real-time local database manager
class MockDataManager {
  private assignments: any[] = [];
  private availableJobs: any[] = [];
  private parts: MockPart[] = [];
  private reviews: MockReview[] = [];
  private nonShsJobs: any[] = [];
  private cart: any[] = [];
  private chatHistory: any[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.assignments = JSON.parse(JSON.stringify(initialAssignments));
    this.availableJobs = JSON.parse(JSON.stringify(initialAvailableJobs));
    this.parts = JSON.parse(JSON.stringify(initialParts));
    this.reviews = JSON.parse(JSON.stringify(initialReviews));
    this.nonShsJobs = JSON.parse(JSON.stringify(initialNonShsJobs));
    this.cart = [];
    this.chatHistory = [
      {
        id: '1',
        role: 'assistant',
        content: "Good morning, technician! I'm Sasha, your AI assistant. Here's what I can help you with:\n- Get your job schedule and SO details\n- Diagnose a repair issue\n- Running late? I'll handle customer updates\n- Check your earnings and performance",
        timestamp: '9:15 AM'
      }
    ];
  }

  getAssignments() { return this.assignments; }
  getAssignment(id: string) { return this.assignments.find(a => a.id === id); }
  
  updateAssignmentStatus(id: string, status: string, options?: any) {
    const a = this.getAssignment(id);
    if (a) {
      a.status = status;
      if (options) {
        if (options.completionNotes) a.completionNotes = options.completionNotes;
        if (options.completionType) a.completionType = options.completionType;
        if (options.repairCode) a.repairCode = options.repairCode;
        if (options.customerAcknowledged) a.customerAcknowledged = options.customerAcknowledged;
        if (options.rescheduleReason) a.rescheduleReason = options.rescheduleReason;
        if (options.nextAppointment) a.job.scheduledDate = options.nextAppointment;
        if (options.applianceBrandname) a.job.manufacturerBrand = options.applianceBrandname;
        if (options.applianceModel) a.job.applianceModel = options.applianceModel;
        if (options.applianceSerial) a.job.applianceSerial = options.applianceSerial;
        if (options.applianceIssue) a.job.serviceDescription = options.applianceIssue;
      }
      return { success: true, data: a };
    }
    return { success: false, message: 'Assignment not found' };
  }

  claimJob(soNumber: string) {
    const jobIdx = this.availableJobs.findIndex(j => j.soNumber === soNumber);
    if (jobIdx > -1) {
      const job = this.availableJobs[jobIdx];
      this.availableJobs.splice(jobIdx, 1);
      
      const newAssignment = {
        id: job.soNumber.split('-')[1],
        soNumber: job.soNumber,
        status: 'assigned',
        scheduledDate: job.scheduledDate,
        scheduledArrival: `${job.scheduledDate}T12:00:00.000Z`,
        assignedAt: new Date().toISOString(),
        job: {
          id: `job-${job.id}`,
          soNumber: job.soNumber,
          customerName: 'New Customer',
          customerPhone: '555-987-6543',
          customerAddress: job.address,
          customerCity: job.city,
          customerState: job.state,
          customerZip: '60192',
          scheduledDate: job.scheduledDate,
          scheduledTimeWindow: job.scheduledTimeWindow,
          applianceType: job.appliance,
          manufacturerBrand: job.brand,
          applianceModel: '-',
          applianceSerial: '-',
          serviceDescription: 'Claimed available job',
          priority: false,
        },
        guidelines: [
          { id: '1', text: 'Introduce yourself', checked: false },
          { id: '2', text: 'Wear shoe covers', checked: false },
          { id: '3', text: 'Explain diagnosis and repair plan', checked: false },
          { id: '4', text: 'Take before/after photos', checked: false },
          { id: '5', text: 'Clean work area', checked: false },
        ],
        parts: []
      };

      this.assignments.push(newAssignment);
      return { success: true, data: newAssignment };
    }
    return { success: false, message: 'Job not found' };
  }

  getAvailableJobs() { return this.availableJobs; }
  getParts() { return this.parts; }
  getReviews() { return this.reviews; }
  getNonShsJobs() { return this.nonShsJobs; }
  
  logNonShsJob(job: any) {
    const newJob = {
      id: `non-shs-${Date.now()}`,
      ...job
    };
    this.nonShsJobs.push(newJob);
    return { success: true, data: newJob };
  }

  getCart() { return this.cart; }
  
  addToCart(part: any) {
    const existing = this.cart.find(item => item.partNo === part.partNo);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({ ...part, quantity: 1 });
    }
    return this.cart;
  }

  updateCartQty(partNo: string, qty: number) {
    const item = this.cart.find(i => i.partNo === partNo);
    if (item) {
      item.quantity = Math.max(1, qty);
    }
    return this.cart;
  }

  removeFromCart(partNo: string) {
    this.cart = this.cart.filter(i => i.partNo !== partNo);
    return this.cart;
  }

  clearCart() {
    this.cart = [];
  }

  getChatHistory() { return this.chatHistory; }
  addChatMessage(role: 'user' | 'assistant', content: string, customProps?: any) {
    const msg = {
      id: `msg-${Date.now()}`,
      role,
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      ...customProps
    };
    this.chatHistory.push(msg);
    return msg;
  }
}

export const mockDb = new MockDataManager();
