const express = require('express');
const router = express.Router();
const dbService = require('../services/db-service');
const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

// Get all emails with attachments from database
router.get('/emails', async (req, res) => {
  try {
    const emails = await dbService.getEmailsWithAttachments();
    res.json({
      success: true,
      emails: emails,
      count: emails.length
    });
  } catch (error) {
    console.error('Error fetching emails from database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emails from database',
      error: error.message
    });
  }
});

// Get Excel data by attachment ID
router.get('/excel-data/:attachmentId', async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const excelData = await dbService.getExcelDataByAttachmentId(attachmentId);
    
    res.json({
      success: true,
      data: excelData,
      rowCount: excelData.length
    });
  } catch (error) {
    console.error('Error fetching excel data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch excel data',
      error: error.message
    });
  }
});

// Export formatted Excel file
router.post('/export-formatted-excel', async (req, res) => {
  try {
    const { attachmentId, templateId, fileName } = req.body;
    
    if (!attachmentId) {
      return res.status(400).json({
        success: false,
        message: 'Attachment ID is required'
      });
    }

    // Get the Excel data from database
    const excelData = await dbService.getExcelDataByAttachmentId(attachmentId);
    
    if (!excelData || excelData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found for the given attachment'
      });
    }

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare the data with the first 5 rows as template data if templateId is provided
    let finalData = [];
    
    if (templateId) {
      // Get template data
      const template = await dbService.getTemplate(templateId);
      
      // Add first 5 rows from template (or empty rows if no template)
      if (template && template.header_rows) {
        for (let i = 0; i < 5; i++) {
          if (template.header_rows[i]) {
            finalData.push(template.header_rows[i]);
          } else {
            // Add empty row if template doesn't have enough rows
            finalData.push([]);
          }
        }
      } else {
        // Add 5 empty rows if no template
        for (let i = 0; i < 5; i++) {
          finalData.push([]);
        }
      }
    } else {
      // Add 5 empty rows if no template specified
      for (let i = 0; i < 5; i++) {
        finalData.push([]);
      }
    }
    
    // Add the actual Excel data after the first 5 rows
    excelData.forEach(row => {
      finalData.push(row);
    });

    // Convert to worksheet
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Generate filename
    const defaultFileName = fileName || `formatted_excel_${attachmentId}_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../temp', defaultFileName);

    // Write the file
    XLSX.writeFile(wb, filePath);

    // Send the file as download
    res.download(filePath, defaultFileName, async (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Clean up the temporary file after download
      try {
        await fs.unlink(filePath);
      } catch (unlinkErr) {
        console.error('Error deleting temporary file:', unlinkErr);
      }
    });

  } catch (error) {
    console.error('Error exporting formatted excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export formatted Excel file',
      error: error.message
    });
  }
});

// Save/update a template
router.post('/templates', async (req, res) => {
  try {
    const { merchantName, templateName, headerRows } = req.body;

    if (!merchantName || !templateName || !headerRows) {
      return res.status(400).json({
        success: false,
        message: 'Merchant name, template name, and header rows are required'
      });
    }

    const templateId = await dbService.saveTemplate({
      merchantName,
      templateName,
      headerRows
    });

    res.json({
      success: true,
      message: 'Template saved successfully',
      templateId
    });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save template',
      error: error.message
    });
  }
});

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await dbService.getAllTemplates();
    
    res.json({
      success: true,
      templates: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: true,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

module.exports = router;