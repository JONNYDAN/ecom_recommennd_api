const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection URI - Update this with your actual connection string
const uri = 'mongodb://quizeradm:quizer%4012q@xmentor.vn:27017/ecom?retryWrites=true&loadBalanced=false&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1'
const client = new MongoClient(uri);

// Helper function to generate a slug from a title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Generate 3 products for a single category
function generateProductsForCategory(category, startIndex) {
  const products = [];
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '39', '40', '41', '42', '43'];
  const productPrefixes = ['Thời trang', 'Phong cách', 'Cao cấp', 'Đẹp', 'Sang trọng', 'Cá tính'];
  const productTypes = {
    'Labubu Chính hãng': ['Labubu Classic', 'Labubu Mini', 'Labubu Special Edition', 'Labubu Collectible'],
    'Baby Three chính hãng': ['Baby Three Classic', 'Baby Three Mini', 'Baby Three Special Edition'],
    'Vali': ['Vali du lịch', 'Vali kéo', 'Vali xách tay', 'Vali nhỏ', 'Vali lớn'],
    'Giày': ['Giày thể thao', 'Giày chạy bộ', 'Giày đá banh', 'Giày casual', 'Giày đi bộ'],
    'Túi': ['Túi xách', 'Túi đeo chéo', 'Túi đeo vai', 'Balo', 'Túi du lịch'],
    'Áo': ['Áo thun', 'Áo sơ mi', 'Áo khoác', 'Áo polo', 'Áo hoodie'],
    'Quần': ['Quần jean', 'Quần khaki', 'Quần short', 'Quần dài', 'Quần thể thao'],
    'Dép - Sandal': ['Dép đi biển', 'Dép trong nhà', 'Sandal nam', 'Sandal nữ', 'Dép thể thao'],
    'Nón': ['Nón lưỡi trai', 'Nón bucket', 'Mũ len', 'Mũ bảo hiểm', 'Nón thời trang'],
    'Vớ': ['Vớ ngắn', 'Vớ dài', 'Vớ thể thao', 'Vớ cotton', 'Vớ len'],
    'Arts Toys': ['Đồ chơi nghệ thuật', 'Mô hình', 'Đồ sưu tầm', 'Figures', 'Toys']
  };
  
  const brands = ['Nike', 'Adidas', 'Puma', 'Fila', 'Under Armour', 'New Balance', 'Converse', 'Champion', 'H&M', 'Uniqlo'];
  const colors = ['đen', 'trắng', 'xanh', 'đỏ', 'vàng', 'xám', 'hồng', 'tím', 'cam', 'bạc'];
  
  const imageUrls = [
    'https://bizweb.dktcdn.net/100/467/909/products/480989647-1736534670264560-45733.jpg?v=1740552739347',
    'https://bizweb.dktcdn.net/thumb/medium/100/467/909/products/480989647-1736534670264560-45733.jpg?v=1740552739347',
    'https://bizweb.dktcdn.net/100/467/909/products/534590520-1644407499443860-9191915979356410309-n.jpg?v=1740550526273',
    'https://bizweb.dktcdn.net/100/467/909/products/534535695-266906223202044-2106259325149256937-n.jpg?v=1740550526273',
    'https://bizweb.dktcdn.net/100/467/909/products/529195926-747980500801312-8232262633134993998-n.jpg?v=1740546603830',
    'https://bizweb.dktcdn.net/100/467/909/products/534565559-1142034417280626-2701126065214511374-n.jpg?v=1740546603830',
    'https://bizweb.dktcdn.net/100/467/909/products/482768747-1027729902045422-44980.jpg?v=1740548233330'
  ];
  
  const categoryName = category.name;
  
  // Create 3 products for this category
  for (let i = 1; i <= 3; i++) {
    const productIndex = startIndex + i;
    
    // Generate random product details based on category
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const prefix = productPrefixes[Math.floor(Math.random() * productPrefixes.length)];
    
    const productTypeOptions = productTypes[categoryName] || ['Sản phẩm'];
    const productType = productTypeOptions[Math.floor(Math.random() * productTypeOptions.length)];
    
    // Generate title
    const title = `${productType} ${brand} ${color} ${productIndex}`;
    
    // Generate random sizes (1-4 options)
    const numberOfSizes = Math.floor(Math.random() * 4) + 1;
    const size = [];
    for (let j = 0; j < numberOfSizes; j++) {
      const randomSize = sizeOptions[Math.floor(Math.random() * sizeOptions.length)];
      if (!size.includes(randomSize)) {
        size.push(randomSize);
      }
    }
    
    // Generate random prices
    const originalPrice = Math.floor(Math.random() * 900000) + 100000; // 100,000 - 1,000,000
    const discount = Math.random() < 0.7 ? Math.random() * 0.5 : 0; // 70% chance of discount up to 50%
    const salePrice = Math.floor(originalPrice * (1 - discount));
    
    // Generate random images (2-4 images)
    const numberOfImages = Math.floor(Math.random() * 3) + 2;
    const images = [];
    for (let j = 0; j < numberOfImages; j++) {
      images.push(imageUrls[Math.floor(Math.random() * imageUrls.length)]);
    }
    
    // Create product object using the exact structure requested
    const product = {
      code: `P${productIndex.toString().padStart(3, '0')}${Math.floor(Math.random() * 10)}`,
      title,
      slug: generateSlug(title),
      size,
      originalPrice,
      salePrice,
      images,
      description: `Mô tả chi tiết về sản phẩm ${title}. Sản phẩm ${categoryName.toLowerCase()} chất lượng cao, thiết kế đẹp và hiện đại.`,
      createdAt: {
        $date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString()
      },
      updatedAt: {
        $date: new Date().toISOString()
      },
      __v: 0,
      category: {
        $oid: category._id
      }
    };
    
    products.push(product);
  }
  
  return products;
}

async function insertProducts() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Get all categories from the database
    const categories = await db.collection('categories').find().toArray();
    console.log(`Found ${categories.length} categories`);
    
    // Generate 3 products for each category
    let allProducts = [];
    let productCounter = 0;
    
    for (const category of categories) {
      console.log(`Generating products for category: ${category.name}`);
      const categoryProducts = generateProductsForCategory(category, productCounter);
      allProducts = [...allProducts, ...categoryProducts];
      productCounter += 3;
    }
    
    // Insert all products into the database
    if (allProducts.length > 0) {
      const result = await db.collection('products').insertMany(allProducts);
      console.log(`${result.insertedCount} products were successfully inserted.`);
    } else {
      console.log('No products were generated. Check if categories were found.');
    }
    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
insertProducts();
