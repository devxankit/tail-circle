export const defaultBreeds = [
  // --- DOGS ---
  {
    id: 'dog_golden_retriever',
    species: 'Dog',
    name: 'Golden Retriever',
    size: 'Large',
    personality: 'Energetic, food-loving & gentle',
    description: 'Golden Retrievers are outgoing, loyal, and highly trainable family companions. They thrive on human interaction and require consistent exercise and mental stimulation.',
    image: '/assets/breeds/golden_retriever.png',
    traits: ['Friendly', 'Family Dog', 'High Energy', 'Heavy Shedding'],
    summary: {
      weightRange: '25 - 36 kg',
      energyLevel: 'High',
      lifeSpan: '10 - 12 Years',
      foodRequirement: 'High-quality dry food rich in proteins (3 cups daily)',
      groomingRequirement: 'Brush 2-3 times weekly to avoid tangles and mats',
      exerciseRequirement: '1.5 - 2 Hours of high-intensity play & walking',
      monthlyCost: 4500
    },
    recommendations: {
      food: [9, 30, 10, 36, 74],
      treats: [45, 46, 13, 47],
      toys: [54, 55, 18, 56],
      health: [73, 74],
      accessories: [5, 85, 86],
      grooming: [63, 64, 25, 65],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'Golden Retriever Monthly Box',
      productIds: [30, 46, 74, 63, 64, 65, 56, 54],
      originalPrice: 5499,
      bundlePrice: 4299
    },
    guidance: {
      9: 'Good To Have',
      30: 'Must Have',
      10: 'Good To Have',
      36: 'Optional',
      74: 'Must Have',
      45: 'Must Have',
      46: 'Must Have',
      13: 'Good To Have',
      47: 'Optional',
      54: 'Must Have',
      55: 'Good To Have',
      18: 'Good To Have',
      56: 'Optional',
      73: 'Must Have',
      5: 'Good To Have',
      85: 'Must Have',
      86: 'Good To Have',
      63: 'Must Have',
      64: 'Must Have',
      25: 'Good To Have',
      65: 'Must Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },
  {
    id: 'dog_labrador',
    species: 'Dog',
    name: 'Labrador Retriever',
    size: 'Large',
    personality: 'Friendly, outgoing & high-spirited',
    description: 'Labradors are companionable housemates who bond closely with the whole family. They are athletic, love water, and have an immense appetite.',
    image: '/assets/breeds/labrador.png',
    traits: ['Active', 'Outgoing', 'Very Friendly', 'Eager To Please'],
    summary: {
      weightRange: '27 - 40 kg',
      energyLevel: 'High',
      lifeSpan: '10 - 12 Years',
      foodRequirement: 'Balanced calorie control to avoid obesity (3 cups daily)',
      groomingRequirement: 'Weekly brushing to remove dead short hairs',
      exerciseRequirement: '2 Hours daily (running, swimming or fetch)',
      monthlyCost: 4200
    },
    recommendations: {
      food: [29, 9, 30],
      treats: [48, 45],
      toys: [53, 54, 58],
      health: [73, 75],
      accessories: [85, 86],
      grooming: [63, 22],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'Labrador Monthly Box',
      productIds: [29, 73, 45, 54, 22, 46],
      originalPrice: 4999,
      bundlePrice: 3999
    },
    guidance: {
      29: 'Must Have',
      9: 'Good To Have',
      30: 'Good To Have',
      48: 'Good To Have',
      45: 'Must Have',
      53: 'Good To Have',
      54: 'Must Have',
      58: 'Must Have',
      73: 'Must Have',
      75: 'Must Have',
      85: 'Must Have',
      86: 'Good To Have',
      63: 'Must Have',
      22: 'Must Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },
  {
    id: 'dog_german_shepherd',
    species: 'Dog',
    name: 'German Shepherd',
    size: 'Large',
    personality: 'Smart, protective & active',
    description: 'German Shepherds are intelligent, highly alert, and work-oriented dogs. They are immensely loyal protectors who require training and structured activity.',
    image: '/assets/breeds/german_shepherd.png',
    traits: ['Smart', 'Protective', 'Highly Trainable', 'Alert'],
    summary: {
      weightRange: '22 - 40 kg',
      energyLevel: 'Very High',
      lifeSpan: '9 - 13 Years',
      foodRequirement: 'High energy diet tailored to working dogs',
      groomingRequirement: 'Daily brushing during high shedding seasons',
      exerciseRequirement: '2 Hours minimum of tracking & walking',
      monthlyCost: 5000
    },
    recommendations: {
      food: [35, 10, 36],
      treats: [45, 46],
      toys: [53, 56],
      health: [73, 76],
      accessories: [85, 86],
      grooming: [63, 24],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'German Shepherd Guard Box',
      productIds: [35, 45, 53, 63, 73],
      originalPrice: 5199,
      bundlePrice: 4299
    },
    guidance: {
      35: 'Must Have',
      10: 'Good To Have',
      36: 'Must Have',
      45: 'Must Have',
      46: 'Good To Have',
      53: 'Must Have',
      56: 'Good To Have',
      73: 'Must Have',
      76: 'Must Have',
      85: 'Must Have',
      86: 'Good To Have',
      63: 'Must Have',
      24: 'Good To Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },
  {
    id: 'dog_beagle',
    species: 'Dog',
    name: 'Beagle',
    size: 'Medium',
    personality: 'Merry, curious & friendly',
    description: 'Beagles are cheerful scenthounds that follow their noses everywhere. They are highly social, gentle-natured, and thrive in active family homes.',
    image: '/assets/breeds/beagle.png',
    traits: ['Curious', 'Cheerful', 'Scent-Driven', 'Playful'],
    summary: {
      weightRange: '9 - 11 kg',
      energyLevel: 'Medium-High',
      lifeSpan: '12 - 15 Years',
      foodRequirement: 'Portion-controlled diet to prevent heavy weight gain',
      groomingRequirement: 'Basic weekly combing with slicker brush',
      exerciseRequirement: '1 - 1.5 Hours daily of sniff walks & tracking games',
      monthlyCost: 3000
    },
    recommendations: {
      food: [29, 32],
      treats: [48],
      toys: [57, 58],
      health: [75, 77],
      accessories: [85, 86],
      grooming: [66],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'Beagle Play & Sniff Bundle',
      productIds: [32, 48, 57, 77],
      originalPrice: 3899,
      bundlePrice: 3199
    },
    guidance: {
      29: 'Good To Have',
      32: 'Must Have',
      48: 'Must Have',
      57: 'Must Have',
      58: 'Good To Have',
      75: 'Must Have',
      77: 'Must Have',
      85: 'Must Have',
      86: 'Good To Have',
      66: 'Must Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },
  {
    id: 'dog_pug',
    species: 'Dog',
    name: 'Pug',
    size: 'Small',
    personality: 'Charming, mischievous & loving',
    description: 'Pugs are flat-faced small lap dogs that love snuggling. They are extremely affectionate and get along with other pets and kids easily.',
    image: '/assets/breeds/pug.png',
    traits: ['Loving', 'Lap Dog', 'Low Exercise', 'Indoor Pet'],
    summary: {
      weightRange: '6 - 9 kg',
      energyLevel: 'Low-Medium',
      lifeSpan: '12 - 15 Years',
      foodRequirement: 'Small-breed weight management formula (1 cup daily)',
      groomingRequirement: 'Daily fold cleaning & weekly nail trims',
      exerciseRequirement: '30 - 45 Minutes of slow, cool-weather walks',
      monthlyCost: 2500
    },
    recommendations: {
      food: [29, 33],
      treats: [49],
      toys: [59],
      health: [78, 79],
      accessories: [85, 86],
      grooming: [67, 68],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'Pug Comfort Monthly Refill',
      productIds: [33, 49, 67, 78],
      originalPrice: 2899,
      bundlePrice: 2299
    },
    guidance: {
      29: 'Good To Have',
      33: 'Must Have',
      49: 'Must Have',
      59: 'Must Have',
      78: 'Must Have',
      79: 'Must Have',
      85: 'Must Have',
      86: 'Good To Have',
      67: 'Must Have',
      68: 'Must Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },
  {
    id: 'dog_husky',
    species: 'Dog',
    name: 'Siberian Husky',
    size: 'Large',
    personality: 'Athletic, high-energy & vocal',
    description: 'Siberian Huskies are northern sled-dogs with striking thick coats. They are highly active, dramatic, and enjoy running long distances.',
    image: '/assets/breeds/husky.png',
    traits: ['Vocal', 'Double Coat', 'Extreme Runner', 'Escape Artist'],
    summary: {
      weightRange: '16 - 27 kg',
      energyLevel: 'High',
      lifeSpan: '12 - 15 Years',
      foodRequirement: 'High caloric efficiency, protein and healthy fats',
      groomingRequirement: 'Daily brush of thick undercoat during blowouts',
      exerciseRequirement: '2+ Hours daily of intense running or hiking',
      monthlyCost: 4800
    },
    recommendations: {
      food: [35, 31],
      treats: [50],
      toys: [60, 58],
      health: [74, 73],
      accessories: [85, 86],
      grooming: [63, 64],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'Husky Arctic Performance Box',
      productIds: [35, 50, 60, 63, 74],
      originalPrice: 4799,
      bundlePrice: 3899
    },
    guidance: {
      35: 'Must Have',
      31: 'Good To Have',
      50: 'Must Have',
      60: 'Must Have',
      58: 'Good To Have',
      74: 'Must Have',
      73: 'Good To Have',
      85: 'Must Have',
      86: 'Good To Have',
      63: 'Must Have',
      64: 'Must Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },
  {
    id: 'dog_shih_tzu',
    species: 'Dog',
    name: 'Shih Tzu',
    size: 'Small',
    personality: 'Affectionate, playful & outgoing',
    description: 'Shih Tzus are little lion dogs known for their long, luxurious locks. They are purely bred for companionship and love spending time with owners.',
    image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300',
    traits: ['Sweet-Tempered', 'Long Hair', 'Lap Companion', 'Playful'],
    summary: {
      weightRange: '4 - 7.5 kg',
      energyLevel: 'Low',
      lifeSpan: '10 - 16 Years',
      foodRequirement: 'Highly digestible dry kibbles formulated for toy breeds',
      groomingRequirement: 'Professional daily coat brushing and detangling',
      exerciseRequirement: '30 Minutes of casual strolls & interactive toys',
      monthlyCost: 3500
    },
    recommendations: {
      food: [34],
      treats: [16, 48],
      toys: [59],
      health: [80, 79],
      accessories: [85, 86],
      grooming: [64, 70, 69],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'Shih Tzu Royal Pamper Box',
      productIds: [34, 48, 64, 80],
      originalPrice: 3599,
      bundlePrice: 2899
    },
    guidance: {
      34: 'Must Have',
      16: 'Good To Have',
      48: 'Must Have',
      59: 'Must Have',
      80: 'Must Have',
      79: 'Must Have',
      85: 'Must Have',
      86: 'Good To Have',
      64: 'Must Have',
      70: 'Must Have',
      69: 'Must Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },
  {
    id: 'dog_rottweiler',
    species: 'Dog',
    name: 'Rottweiler',
    size: 'Large',
    personality: 'Confident, loyal & protective',
    description: 'Rottweilers are muscular working breeds with a gentle, loving side. They are calm, protective of family, and possess outstanding strength.',
    image: 'https://images.unsplash.com/photo-1567752881298-894bb81f9379?auto=format&fit=crop&q=80&w=300',
    traits: ['Powerful', 'Confident Guard', 'Devoted', 'Robust'],
    summary: {
      weightRange: '35 - 60 kg',
      energyLevel: 'Medium-High',
      lifeSpan: '8 - 10 Years',
      foodRequirement: 'High-protein large-breed kibbles to support muscle growth',
      groomingRequirement: 'Weekly brushing with slicker brush to control shed',
      exerciseRequirement: '1.5 Hours of training, runs or cart pulling',
      monthlyCost: 5200
    },
    recommendations: {
      food: [37, 38],
      treats: [51],
      toys: [53],
      health: [73, 81],
      accessories: [85, 86],
      grooming: [71],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'Rottweiler Muscle Essentials Box',
      productIds: [37, 51, 53, 73, 81],
      originalPrice: 4999,
      bundlePrice: 4199
    },
    guidance: {
      37: 'Must Have',
      38: 'Good To Have',
      51: 'Must Have',
      53: 'Must Have',
      73: 'Must Have',
      81: 'Must Have',
      85: 'Must Have',
      86: 'Good To Have',
      71: 'Must Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },
  {
    id: 'dog_doberman',
    species: 'Dog',
    name: 'Doberman',
    size: 'Large',
    personality: 'Alert, loyal & fearless',
    description: 'Dobermans are sleek, elegant, and muscular guardians. They are energetic and extremely intelligent, making them ideal protection companions.',
    image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=300',
    traits: ['Watchdog', 'Fearless', 'Sleek Coat', 'Highly Intelligent'],
    summary: {
      weightRange: '27 - 45 kg',
      energyLevel: 'Very High',
      lifeSpan: '10 - 13 Years',
      foodRequirement: 'Nutrient-rich diet supporting raw athletic energy',
      groomingRequirement: 'Occasional wiping with damp cloth, low shedding',
      exerciseRequirement: '2 Hours daily of hard training & games',
      monthlyCost: 5500
    },
    recommendations: {
      food: [38],
      treats: [45],
      toys: [61],
      health: [81, 73],
      accessories: [85, 86],
      grooming: [71],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'Doberman Athlete Bundle',
      productIds: [38, 45, 61, 81],
      originalPrice: 5399,
      bundlePrice: 4499
    },
    guidance: {
      38: 'Must Have',
      45: 'Must Have',
      61: 'Must Have',
      81: 'Must Have',
      73: 'Good To Have',
      85: 'Must Have',
      86: 'Good To Have',
      71: 'Must Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },
  {
    id: 'dog_indie',
    species: 'Dog',
    name: 'Indie (Indian Pariah)',
    size: 'Medium',
    personality: 'Hardy, alert & loyal',
    description: 'The Indian Pariah Dog is highly adaptable and has strong natural immunity. They are active guardians and make warm, easy-to-care-for companions.',
    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300',
    traits: ['High Immunity', 'Easy Maintenance', 'Alert Guard', 'Devoted'],
    summary: {
      weightRange: '15 - 25 kg',
      energyLevel: 'High',
      lifeSpan: '13 - 16 Years',
      foodRequirement: 'Standard dry/wet food, home-cooked food fits well',
      groomingRequirement: 'Minimal brushing, extremely low shedding coat',
      exerciseRequirement: '1 Hour of basic neighborhood walk or playtime',
      monthlyCost: 2000
    },
    recommendations: {
      food: [39],
      treats: [46],
      toys: [56, 18],
      health: [82, 83],
      accessories: [85, 86],
      grooming: [71],
      comfort: [27, 87],
      travel: [28, 88]
    },
    monthlyBundle: {
      name: 'Indie Health & Care Essentials Box',
      productIds: [39, 46, 71, 82, 83],
      originalPrice: 2899,
      bundlePrice: 2199
    },
    guidance: {
      39: 'Must Have',
      46: 'Must Have',
      56: 'Must Have',
      18: 'Good To Have',
      82: 'Must Have',
      83: 'Must Have',
      85: 'Must Have',
      86: 'Good To Have',
      71: 'Must Have',
      27: 'Good To Have',
      87: 'Must Have',
      28: 'Optional',
      88: 'Good To Have'
    }
  },

  // --- CATS ---
  {
    id: 'cat_persian',
    species: 'Cat',
    name: 'Persian Cat',
    size: 'Small',
    personality: 'Regal, calm & silky-coated',
    description: 'Persians are quiet, sweet cats who enjoy peaceful surroundings. They are famous for their magnificent long coats and relaxed temperament.',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300',
    traits: ['Calm', 'Indoor Only', 'Long Coat', 'Affectionate'],
    summary: {
      weightRange: '3 - 5.5 kg',
      energyLevel: 'Low',
      lifeSpan: '12 - 15 Years',
      foodRequirement: 'Protein-rich wet foods and hairball formula kibbles',
      groomingRequirement: 'Daily careful combing to prevent mats',
      exerciseRequirement: '20 Minutes of light chasing (laser or feathers)',
      monthlyCost: 3000
    },
    recommendations: {
      food: [40],
      treats: [52],
      toys: [62],
      health: [84, 80],
      accessories: [26],
      grooming: [72, 70],
      comfort: [87],
      travel: [88]
    },
    monthlyBundle: {
      name: 'Persian Fluffy Deluxe Box',
      productIds: [40, 52, 72, 84],
      originalPrice: 3899,
      bundlePrice: 2999
    },
    guidance: {
      40: 'Must Have',
      52: 'Must Have',
      62: 'Must Have',
      84: 'Must Have',
      80: 'Must Have',
      26: 'Good To Have',
      72: 'Must Have',
      70: 'Must Have',
      87: 'Good To Have',
      88: 'Optional'
    }
  },
  {
    id: 'cat_maine_coon',
    species: 'Cat',
    name: 'Maine Coon',
    size: 'Large',
    personality: 'Gentle giant, fluffy & playful',
    description: 'Maine Coons are large, muscular cats with friendly, canine-like traits. They are highly vocal and love playing in water.',
    image: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=300',
    traits: ['Large Size', 'Vocal Singer', 'Playful Companion', 'Water Lover'],
    summary: {
      weightRange: '5 - 11 kg',
      energyLevel: 'Medium',
      lifeSpan: '12 - 15 Years',
      foodRequirement: 'High-quality high-protein dry mix for large cat skeletal health',
      groomingRequirement: 'Thorough brushing twice a week',
      exerciseRequirement: '45 Minutes of puzzle solvers & tall scratching towers',
      monthlyCost: 4000
    },
    recommendations: {
      food: [41],
      treats: [52],
      toys: [62],
      health: [73],
      accessories: [26],
      grooming: [72],
      comfort: [87],
      travel: [88]
    },
    monthlyBundle: {
      name: 'Maine Coon Giant Refill Box',
      productIds: [41, 52, 72, 73],
      originalPrice: 4499,
      bundlePrice: 3699
    },
    guidance: {
      41: 'Must Have',
      52: 'Must Have',
      62: 'Must Have',
      73: 'Must Have',
      26: 'Good To Have',
      72: 'Must Have',
      87: 'Good To Have',
      88: 'Optional'
    }
  },
  {
    id: 'cat_bengal',
    species: 'Cat',
    name: 'Bengal',
    size: 'Medium',
    personality: 'Energetic, wild-looking & active',
    description: 'Bengal cats are athletic, sleek, and highly active companions with beautiful spotted coats. They need plenty of mental stimulation and space.',
    image: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=300',
    traits: ['Spotted Coat', 'Extremely Active', 'Playful', 'Vocal'],
    summary: {
      weightRange: '4 - 7 kg',
      energyLevel: 'Very High',
      lifeSpan: '12 - 16 Years',
      foodRequirement: 'High-protein diet to support their immense active energy',
      groomingRequirement: 'Minimal weekly brushing needed',
      exerciseRequirement: '1.5 Hours of intense playing and jumping',
      monthlyCost: 3500
    },
    recommendations: {
      food: [42],
      treats: [52],
      toys: [62],
      health: [81],
      accessories: [26],
      grooming: [72],
      comfort: [87],
      travel: [88]
    },
    monthlyBundle: {
      name: 'Bengal Active Energy Box',
      productIds: [42, 52, 62, 81],
      originalPrice: 4199,
      bundlePrice: 3299
    },
    guidance: {
      42: 'Must Have',
      52: 'Must Have',
      62: 'Must Have',
      81: 'Must Have',
      26: 'Good To Have',
      72: 'Good To Have',
      87: 'Good To Have',
      88: 'Optional'
    }
  },
  {
    id: 'cat_british_shorthair',
    species: 'Cat',
    name: 'British Shorthair',
    size: 'Medium',
    personality: 'Round, sturdy & easy-going',
    description: 'British Shorthairs are robust, calm cats with a dense, plush coat. They are content with their own company and adapt well to apartments.',
    image: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=300',
    traits: ['Independent', 'Plush Dense Coat', 'Easy-Going', 'Robust'],
    summary: {
      weightRange: '4 - 8 kg',
      energyLevel: 'Low-Medium',
      lifeSpan: '12 - 17 Years',
      foodRequirement: 'Calorie-regulated formula to prevent weight issues',
      groomingRequirement: 'Weekly brushing to remove dead undercoat',
      exerciseRequirement: '30 Minutes of casual toy batting & scratching posts',
      monthlyCost: 3200
    },
    recommendations: {
      food: [43],
      treats: [52],
      toys: [62],
      health: [73],
      accessories: [26],
      grooming: [72],
      comfort: [87],
      travel: [88]
    },
    monthlyBundle: {
      name: 'British Shorthair Balance Pack',
      productIds: [43, 52, 73, 26],
      originalPrice: 3199,
      bundlePrice: 2599
    },
    guidance: {
      43: 'Must Have',
      52: 'Must Have',
      62: 'Good To Have',
      73: 'Must Have',
      26: 'Must Have',
      72: 'Good To Have',
      87: 'Good To Have',
      88: 'Optional'
    }
  },
  {
    id: 'cat_ragdoll',
    species: 'Cat',
    name: 'Ragdoll',
    size: 'Large',
    personality: 'Limp, affectionate & docile',
    description: 'Ragdolls are large, fluffy, and exceptionally affectionate cats that go completely limp when held. They are perfect indoor lap cats.',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300',
    traits: ['Docile', 'Blue Eyes', 'Long Coat', 'Extremely Loving'],
    summary: {
      weightRange: '4.5 - 9 kg',
      energyLevel: 'Low',
      lifeSpan: '12 - 15 Years',
      foodRequirement: 'Indoor balance protein diet to avoid weight gain',
      groomingRequirement: 'Groom 3 times weekly to maintain their fluffy coat',
      exerciseRequirement: '30 Minutes of indoor interaction and play',
      monthlyCost: 3300
    },
    recommendations: {
      food: [44],
      treats: [52],
      toys: [62],
      health: [73],
      accessories: [26],
      grooming: [72],
      comfort: [87],
      travel: [88]
    },
    monthlyBundle: {
      name: 'Ragdoll Cozy Indoor Box',
      productIds: [44, 52, 72, 26],
      originalPrice: 3399,
      bundlePrice: 2699
    },
    guidance: {
      44: 'Must Have',
      52: 'Must Have',
      62: 'Good To Have',
      73: 'Must Have',
      26: 'Must Have',
      72: 'Must Have',
      87: 'Good To Have',
      88: 'Optional'
    }
  }
];
