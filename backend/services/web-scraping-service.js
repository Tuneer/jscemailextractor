const dbService = require('./db-service');
const axios = require('axios');
const cheerio = require('cheerio');

class WebScrapingService {
  constructor() {
    this.scrapingConfig = {
      timeout: 10000,
      maxRetries: 3,
      delayBetweenRequests: 1000 // 1 second
    };
  }

  // Search for products on e-commerce sites
  async searchProducts(query, maxResults = 5) {
    try {
      const results = [];

      // Example: Scraping from a generic e-commerce site
      // In production, you would integrate with specific APIs or scrapers
      const sources = [
        { name: 'Amazon', url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}` },
        { name: 'Flipkart', url: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}` },
        { name: 'Walmart', url: `https://www.walmart.com/search?q=${encodeURIComponent(query)}` }
      ];

      for (const source of sources) {
        try {
          const products = await this.scrapeSource(source, query, maxResults);
          results.push(...products);
          
          // Delay to avoid rate limiting
          await this.sleep(this.scrapingConfig.delayBetweenRequests);
        } catch (error) {
          console.error(`Error scraping ${source.name}:`, error.message);
        }
      }

      return results;
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // Scrape a specific source
  async scrapeSource(source, query, maxResults) {
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: this.scrapingConfig.timeout
      });

      const $ = cheerio.load(response.data);
      const products = [];

      // Generic selector - customize based on actual site structure
      $('.product-item').each((index, element) => {
        if (products.length >= maxResults) return false;

        const title = $(element).find('.product-title').text().trim();
        const priceText = $(element).find('.product-price').text().trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
        const originalPriceText = $(element).find('.original-price').text().trim();
        const originalPrice = parseFloat(originalPriceText.replace(/[^0-9.]/g, '')) || price;
        const rating = parseFloat($(element).find('.rating').text().trim()) || 0;
        const reviewCount = parseInt($(element).find('.review-count').text().replace(/[^0-9]/g, '')) || 0;
        const availability = $(element).find('.availability').text().trim() || 'In Stock';
        const seller = $(element).find('.seller').text().trim() || '';
        const imageUrl = $(element).find('img').attr('src') || '';
        const productUrl = $(element).find('a').attr('href') || '';

        products.push({
          source_website: source.name,
          product_title: title,
          product_url: productUrl.startsWith('http') ? productUrl : `https://${source.name}${productUrl}`,
          product_image_url: imageUrl,
          price: price,
          original_price: originalPrice,
          discount_percent: originalPrice > 0 ? ((originalPrice - price) / originalPrice * 100).toFixed(2) : 0,
          availability: availability,
          seller_name: seller,
          seller_rating: 0, // Would need additional scraping
          product_rating: rating,
          review_count: reviewCount,
          delivery_info: '',
          specifications: {}
        });
      });

      return products;
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error.message);
      return [];
    }
  }

  // Save scraped products to database
  async saveScrapedProducts(couponItemId, products) {
    try {
      const db = await dbService.getConnection();
      const savedProducts = [];

      for (const product of products) {
        const [result] = await db.query(
          `INSERT INTO scraped_products 
           (coupon_item_id, source_website, product_title, product_url, product_image_url, 
            price, original_price, discount_percent, availability, seller_name, 
            seller_rating, product_rating, review_count, delivery_info, specifications) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            couponItemId,
            product.source_website,
            product.product_title,
            product.product_url,
            product.product_image_url,
            product.price,
            product.original_price,
            product.discount_percent,
            product.availability,
            product.seller_name,
            product.seller_rating,
            product.product_rating,
            product.review_count,
            product.delivery_info,
            JSON.stringify(product.specifications)
          ]
        );

        savedProducts.push({
          id: result.insertId,
          ...product
        });
      }

      return savedProducts;
    } catch (error) {
      console.error('Error saving scraped products:', error);
      throw error;
    }
  }

  // Execute scraping job for a coupon family
  async executeScrapingJob(couponFamilyId) {
    try {
      const db = await dbService.getConnection();

      // Get coupon items for this family
      const [items] = await db.query(
        `SELECT * FROM coupon_items WHERE family_id = ? AND is_active = TRUE`,
        [couponFamilyId]
      );

      if (!items || items.length === 0) {
        throw new Error('No active coupon items found for this family');
      }

      // Create scraping job
      const [jobResult] = await db.query(
        `INSERT INTO scraping_jobs (coupon_family_id, status, items_to_scrape) 
         VALUES (?, 'running', ?)`,
        [couponFamilyId, items.length]
      );

      const jobId = jobResult.insertId;
      let itemsScraped = 0;

      // Scrape for each item
      for (const item of items) {
        try {
          // Search for products
          const query = `${item.item_name} ${item.brand || ''}`.trim();
          const products = await this.searchProducts(query, 5);

          // Save to database
          await this.saveScrapedProducts(item.id, products);
          itemsScraped++;

          // Update job progress
          await db.query(
            `UPDATE scraping_jobs SET items_scraped = ? WHERE id = ?`,
            [itemsScraped, jobId]
          );
        } catch (error) {
          console.error(`Error scraping item ${item.id}:`, error.message);
        }
      }

      // Mark job as completed
      await db.query(
        `UPDATE scraping_jobs SET status = 'completed', completed_at = NOW() WHERE id = ?`,
        [jobId]
      );

      return {
        jobId,
        itemsScraped,
        totalItems: items.length
      };
    } catch (error) {
      console.error('Error executing scraping job:', error);
      
      // Mark job as failed
      const db = await dbService.getConnection();
      await db.query(
        `UPDATE scraping_jobs SET status = 'failed', error_message = ? WHERE id = ?`,
        [error.message, jobId]
      ).catch(() => {});

      throw error;
    }
  }

  // Compare prices between merchant and online
  async comparePrices(couponItemId, merchantId) {
    try {
      const db = await dbService.getConnection();

      // Get merchant price
      const [salesData] = await db.query(
        `SELECT AVG(unit_price) as avg_price FROM merchant_sales_data 
         WHERE coupon_item_id = ? AND merchant_id = ?`,
        [couponItemId, merchantId]
      );

      const merchantPrice = salesData[0]?.avg_price || 0;

      // Get online prices
      const [scrapedData] = await db.query(
        `SELECT price, source_website FROM scraped_products 
         WHERE coupon_item_id = ? ORDER BY scraped_at DESC LIMIT 5`,
        [couponItemId]
      );

      if (!merchantPrice || scrapedData.length === 0) {
        return null;
      }

      const comparisons = [];

      for (const online of scrapedData) {
        const priceDifference = merchantPrice - online.price;
        const priceDifferencePercent = ((priceDifference / online.price) * 100).toFixed(2);
        const isCheaper = merchantPrice < online.price;
        
        // Calculate competitiveness score (0-100)
        let competitivenessScore = 50;
        if (isCheaper) {
          competitivenessScore = Math.min(100, 50 + Math.abs(priceDifferencePercent));
        } else {
          competitivenessScore = Math.max(0, 50 - Math.abs(priceDifferencePercent));
        }

        // Generate recommendation
        let recommendation = '';
        if (competitivenessScore >= 80) {
          recommendation = 'Excellent pricing - maintain current strategy';
        } else if (competitivenessScore >= 60) {
          recommendation = 'Competitive pricing - monitor closely';
        } else if (competitivenessScore >= 40) {
          recommendation = 'Consider price adjustment to stay competitive';
        } else {
          recommendation = 'Urgent: Price significantly higher than market';
        }

        const [result] = await db.query(
          `INSERT INTO price_comparison 
           (coupon_item_id, merchant_id, scraped_product_id, merchant_price, online_price, 
            price_difference, price_difference_percent, is_merchant_cheaper, 
            competitiveness_score, recommendation) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            couponItemId,
            merchantId,
            online.id,
            merchantPrice,
            online.price,
            priceDifference.toFixed(2),
            priceDifferencePercent,
            isCheaper,
            competitivenessScore.toFixed(2),
            recommendation
          ]
        );

        comparisons.push({
          id: result.insertId,
          merchant_price: merchantPrice,
          online_price: online.price,
          online_source: online.source_website,
          price_difference: priceDifference.toFixed(2),
          price_difference_percent: priceDifferencePercent,
          is_cheaper: isCheaper,
          competitiveness_score: competitivenessScore.toFixed(2),
          recommendation
        });
      }

      return comparisons;
    } catch (error) {
      console.error('Error comparing prices:', error);
      throw error;
    }
  }

  // Generate sales analytics summary
  async generateSalesAnalytics(merchantId, couponFamilyId, daysBack = 30) {
    try {
      const db = await dbService.getConnection();

      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - daysBack);

      // Get all coupon items in the family
      const [items] = await db.query(
        `SELECT * FROM coupon_items WHERE family_id = ? AND is_active = TRUE`,
        [couponFamilyId]
      );

      const summaries = [];

      for (const item of items) {
        // Get sales data
        const [salesData] = await db.query(
          `SELECT 
             SUM(quantity_sold) as total_qty,
             SUM(total_amount) as total_revenue,
             SUM((unit_price - cost_price) * quantity_sold) as total_profit,
             AVG(unit_price) as avg_price,
             COUNT(DISTINCT transaction_id) as total_transactions,
             COUNT(DISTINCT customer_count) as unique_customers
           FROM merchant_sales_data 
           WHERE coupon_item_id = ? AND merchant_id = ? AND sale_date >= ?`,
          [item.id, merchantId, periodStart]
        );

        const stats = salesData[0];

        // Determine market position
        let marketPosition = 'Average';
        if (stats.total_profit && stats.total_revenue) {
          const profitMargin = (stats.total_profit / stats.total_revenue) * 100;
          if (profitMargin > 30) marketPosition = 'Premium';
          else if (profitMargin > 15) marketPosition = 'Competitive';
          else marketPosition = 'Budget';
        }

        // Calculate growth rate (simplified)
        const growthRate = 5.0; // Would need historical data for real calculation

        // Generate recommendations
        const recommendations = {
          pricing: stats.avg_price > 0 ? 'Monitor pricing strategy' : 'No sales data',
          inventory: stats.total_qty > 0 ? 'Maintain stock levels' : 'Consider promotion',
          marketing: stats.unique_customers > 0 ? 'Focus on repeat customers' : 'Acquire new customers'
        };

        const [result] = await db.query(
          `INSERT INTO sales_analytics_summary 
           (merchant_id, coupon_family_id, coupon_item_id, period_start, period_end, 
            total_quantity_sold, total_revenue, total_profit, average_unit_price, 
            total_transactions, unique_customers, market_position, growth_rate, recommendations) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            merchantId,
            couponFamilyId,
            item.id,
            periodStart,
            new Date(),
            stats.total_qty || 0,
            stats.total_revenue || 0,
            stats.total_profit || 0,
            stats.avg_price || 0,
            stats.total_transactions || 0,
            stats.unique_customers || 0,
            marketPosition,
            growthRate,
            JSON.stringify(recommendations)
          ]
        );

        summaries.push({
          id: result.insertId,
          item_id: item.id,
          item_name: item.item_name,
          ...stats,
          market_position: marketPosition,
          growth_rate: growthRate,
          recommendations
        });
      }

      return summaries;
    } catch (error) {
      console.error('Error generating sales analytics:', error);
      throw error;
    }
  }

  // Utility function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WebScrapingService();
