// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// Mock types for Firebase (if actual Firebase import fails)
interface MealRecord {
  employeeId: string;
  mealType: 'MORNING' | 'EVENING';
  counterId: number;
  timestamp: number;
  date?: string;
}

interface CheckResult {
  exists: boolean;
  error?: string;
  mealType?: string;
  counterId?: number;
}

interface SaveResult {
  success: boolean;
  error?: string;
}

// Try to import Firebase, but provide fallbacks
let firebase: any = null;
try {
  const firebaseModule = require('@/lib/firebase');
  firebase = firebaseModule;
} catch (e) {
  console.warn('Firebase not configured. Using mock data.');
}

export default function MealManagement() {
  const [employeeId, setEmployeeId] = useState('');
  const [counterId, setCounterId] = useState<number>(1);
  const [mealType, setMealType] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [response, setResponse] = useState('');
  const [todayMeals, setTodayMeals] = useState<MealRecord[]>([]);
  const [history, setHistory] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastSync, setLastSync] = useState<string>('Never');
  const [archiveStatus, setArchiveStatus] = useState<string>('Checking...');
  const [showTodayMeals, setShowTodayMeals] = useState(false);
  const [morningCount, setMorningCount] = useState<number>(0);
  const [eveningCount, setEveningCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [showScheduleSettings, setShowScheduleSettings] = useState<boolean>(false);

  // Set default value first (runs on server and client)
  const [scheduledTime, setScheduledTime] = useState('19:00');
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(true);

  // Update from localStorage only after component mounts (client-only)
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const savedTime = localStorage.getItem('excelDownloadTime');
      const savedEnabled = localStorage.getItem('excelAutoDownloadEnabled');

      if (savedTime) setScheduledTime(savedTime);
      if (savedEnabled !== null) setAutoDownloadEnabled(savedEnabled !== 'false');
    }
  }, []);

  // ✅ SECOND - Initialize scheduler (after localStorage ready)
  // useEffect(() => {
  //   setMounted(true);
  //   initializeApp();

  //   setTimeout(() => {
  //     scheduleAutomaticDownload();
  //   }, 100);
  // }, []);


  useEffect(() => {
    setMounted(true);
    initializeApp();

    // ✅ Load localStorage values
    if (typeof localStorage !== 'undefined') {
      const savedTime = localStorage.getItem('excelDownloadTime');
      const savedEnabled = localStorage.getItem('excelAutoDownloadEnabled');

      console.log('📂 [INIT] Loading from localStorage:', { savedTime, savedEnabled });

      if (savedTime) setScheduledTime(savedTime);
      if (savedEnabled !== null) setAutoDownloadEnabled(savedEnabled !== 'false');
    }

    // ✅ Start scheduler after a small delay
    const timeoutId = setTimeout(() => {
      console.log('⏱️ [INIT] Starting scheduler...');
      scheduleAutomaticDownload();
    }, 500);

    // Cleanup timeout if component unmounts
    return () => clearTimeout(timeoutId);
  }, []);


  useEffect(() => {
    if (todayMeals.length > 0 || mounted) {
      calculateMealCounts();
    }
  }, [todayMeals, mounted]);

  const initializeApp = async () => {
    try {
      // if (firebase?.initializeArchiveSchedule) {
      //   firebase.initializeArchiveSchedule();
      // }
      await checkAndArchive();
      await loadTodayMeals();
    } catch (error) {
      console.error('Error initializing app:', error);
      setArchiveStatus('⚠️ Firebase not configured');
    }
  };

  const checkAndArchive = async () => {
    try {
      if (!firebase?.shouldArchive) {
        setArchiveStatus('✅ Archive up to date');
        return;
      }

      const needsArchive = await firebase.shouldArchive();
      if (needsArchive) {
        console.log('🔄 Running auto-archive on app load...');
        const result = await firebase.archiveYesterdayData();
        setArchiveStatus(`✅ Auto-archived ${result.archived} records`);
      } else {
        setArchiveStatus('✅ Archive up to date');
      }
    } catch (error) {
      console.error('Archive check error:', error);
      setArchiveStatus('✅ Archive up to date');
    }
  };

  const loadTodayMeals = async () => {
    try {
      if (firebase?.getTodayMeals) {
        const meals = await firebase.getTodayMeals();
        setTodayMeals(meals);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
    }
    setLastSync(new Date().toLocaleTimeString());
  };

  const calculateMealCounts = () => {
    let morning = 0;
    let evening = 0;

    todayMeals.forEach((meal) => {
      if (meal.mealType === 'MORNING') {
        morning += 1;
      } else if (meal.mealType === 'EVENING') {
        evening += 1;
      }
    });

    setMorningCount(morning);
    setEveningCount(evening);
    setTotalCount(morning + evening);
  };

  const handleProvideMeal = async () => {
    if (!employeeId.trim()) {
      setResponse('❌ Please enter employee ID');
      return;
    }

    if (!firebase?.checkEmployeeExists) {
      setResponse('❌ Firebase not configured. Please check your setup.');
      return;
    }

    setLoading(true);

    try {
      const check: CheckResult = await firebase.checkEmployeeExists(employeeId);

      if (check.error) {
        setResponse(`❌ ${check.error}`);
        setLoading(false);
        return;
      }

      if (check.exists) {
        setResponse(
          `❌ Employee ${employeeId} already received a meal today\n(${check.mealType} at Counter ${check.counterId})`
        );
        setLoading(false);
        return;
      }

      const result: SaveResult = await firebase.saveMealRecord(employeeId, mealType, counterId);

      if (result.success) {
        setResponse(
          `✅ Meal provided successfully!\nEmployee: ${employeeId}\nType: ${mealType}\nCounter: ${counterId}`
        );
        setEmployeeId('');
        await loadTodayMeals();
      } else {
        setResponse(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setResponse(`❌ ${error.message || 'An error occurred'}`);
    }

    setLoading(false);
  };

  const handleCheckEligibility = async () => {
    if (!employeeId.trim()) {
      setResponse('❌ Please enter employee ID');
      return;
    }

    if (!firebase?.checkEmployeeExists) {
      setResponse('❌ Firebase not configured. Please check your setup.');
      return;
    }

    setLoading(true);
    try {
      const check: CheckResult = await firebase.checkEmployeeExists(employeeId);

      if (check.error) {
        setResponse(`❌ ${check.error}`);
      } else if (check.exists) {
        setResponse(
          `❌ Employee ${employeeId} already received a meal today\n(${check.mealType} at Counter ${check.counterId})`
        );
      } else {
        setResponse(`✅ Employee ${employeeId} is ELIGIBLE for a meal`);
      }
    } catch (error: any) {
      setResponse(`❌ ${error.message || 'An error occurred'}`);
    }

    setLoading(false);
  };

  const fetchHistory = async () => {
    if (!employeeId.trim()) {
      setResponse('❌ Please enter employee ID');
      return;
    }

    if (!firebase?.getEmployeeHistory) {
      setResponse('❌ Firebase not configured. Please check your setup.');
      return;
    }

    try {
      const records = await firebase.getEmployeeHistory(employeeId);
      setHistory(records);
      setResponse(`📋 Showing ${records.length} past meal records for ${employeeId}`);
    } catch (error: any) {
      setResponse(`❌ ${error.message || 'An error occurred'}`);
    }
  };

  const downloadExcel = async () => {
    try {
      // Fetch all today's meals
      if (!firebase?.getTodayMeals) {
        setResponse('❌ Firebase not configured');
        return;
      }

      const allMeals = await firebase.getTodayMeals();

      // Separate morning and evening meals
      const morningMeals = allMeals.filter((meal: MealRecord) => meal.mealType === 'MORNING');
      const eveningMeals = allMeals.filter((meal: MealRecord) => meal.mealType === 'EVENING');

      // Create workbook
      const wb = XLSX.utils.book_new();

      // ========== SUMMARY SHEET ==========
      const summaryData = [
        ['MEAL MANAGEMENT REPORT'],
        ['Date:', new Date().toLocaleDateString()],
        [''],
        ['Summary Statistics'],
        ['Morning Meals:', morningMeals.length],
        ['Evening Meals:', eveningMeals.length],
        ['Total Employees Fed:', morningMeals.length + eveningMeals.length],
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // ========== MORNING SHEET ==========
      const morningHeaders = ['Employee ID', 'Counter', 'Time', 'Date'];
      const morningRows = morningMeals.map((meal: MealRecord) => [
        meal.employeeId,
        meal.counterId,
        new Date(meal.timestamp).toLocaleTimeString(),
        meal.date || new Date(meal.timestamp).toLocaleDateString(),
      ]);

      const morningData = [morningHeaders, ...morningRows];
      const morningWs = XLSX.utils.aoa_to_sheet(morningData);

      // Style morning sheet
      morningWs['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];

      // Add header styling
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'FFB84D' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      for (let i = 0; i < morningHeaders.length; i++) {
        const cellRef = XLSX.utils.encode_col(i) + '1';
        if (morningWs[cellRef]) {
          morningWs[cellRef].s = headerStyle;
        }
      }

      XLSX.utils.book_append_sheet(wb, morningWs, 'Morning Meals');

      // ========== EVENING SHEET ==========
      const eveningHeaders = ['Employee ID', 'Counter', 'Time', 'Date'];
      const eveningRows = eveningMeals.map((meal: MealRecord) => [
        meal.employeeId,
        meal.counterId,
        new Date(meal.timestamp).toLocaleTimeString(),
        meal.date || new Date(meal.timestamp).toLocaleDateString(),
      ]);

      const eveningData = [eveningHeaders, ...eveningRows];
      const eveningWs = XLSX.utils.aoa_to_sheet(eveningData);

      // Style evening sheet
      eveningWs['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];

      // Add header styling
      const eveningHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'FF6B35' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      for (let i = 0; i < eveningHeaders.length; i++) {
        const cellRef = XLSX.utils.encode_col(i) + '1';
        if (eveningWs[cellRef]) {
          eveningWs[cellRef].s = eveningHeaderStyle;
        }
      }

      XLSX.utils.book_append_sheet(wb, eveningWs, 'Evening Meals');

      // ========== COMBINED SHEET ==========
      const combinedHeaders = ['Meal Type', 'Employee ID', 'Counter', 'Time', 'Date'];
      const combinedRows = [
        ...morningMeals.map((meal: MealRecord) => [
          'MORNING',
          meal.employeeId,
          meal.counterId,
          new Date(meal.timestamp).toLocaleTimeString(),
          meal.date || new Date(meal.timestamp).toLocaleDateString(),
        ]),
        ...eveningMeals.map((meal: MealRecord) => [
          'EVENING',
          meal.employeeId,
          meal.counterId,
          new Date(meal.timestamp).toLocaleTimeString(),
          meal.date || new Date(meal.timestamp).toLocaleDateString(),
        ]),
      ];

      const combinedData = [combinedHeaders, ...combinedRows];
      const combinedWs = XLSX.utils.aoa_to_sheet(combinedData);

      // Style combined sheet
      combinedWs['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];

      // Add header styling
      const combinedHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '455A64' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      for (let i = 0; i < combinedHeaders.length; i++) {
        const cellRef = XLSX.utils.encode_col(i) + '1';
        if (combinedWs[cellRef]) {
          combinedWs[cellRef].s = combinedHeaderStyle;
        }
      }

      XLSX.utils.book_append_sheet(wb, combinedWs, 'All Meals');

      // ========== DOWNLOAD ==========
      const fileName = `Meal_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setResponse(`✅ Excel file downloaded successfully!\nFile: ${fileName}\nMorning: ${morningMeals.length} | Evening: ${eveningMeals.length}`);
    } catch (error: any) {
      setResponse(`❌ ${error.message || 'Error downloading Excel'}`);
    }
  };

  // ========================================================================================

  const scheduleAutomaticDownload = () => {
    console.log('🔍 [SCHEDULER] Initializing...');

    if (typeof localStorage === 'undefined') {
      console.log('❌ localStorage not available');
      return;
    }

    // ✅ ALWAYS read fresh from localStorage
    const readSettings = () => {
      const enabled = localStorage.getItem('excelAutoDownloadEnabled') !== 'false';
      const time = localStorage.getItem('excelDownloadTime') || '19:00';
      return { enabled, time };
    };

    const { enabled, time } = readSettings();

    console.log('📊 [SCHEDULER] Settings:', { enabled, time });

    if (!enabled) {
      console.log('⚠️ [SCHEDULER] Automatic download disabled');
      return;
    }

    const [targetHours, targetMinutes] = time.split(':').map(Number);
    console.log(`⏰ [SCHEDULER] Target time: ${targetHours}:${targetMinutes.toString().padStart(2, '0')}`);

    // ✅ CREATE A PERSISTENT CHECKER FUNCTION
    let lastCheckedMinute = -1;

    const checkAndDownload = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // ✅ Check if within the target minute (any second in that minute)
      if (hours === targetHours && minutes === targetMinutes) {
        // Only log/download once per minute
        if (lastCheckedMinute !== minutes) {
          const today = new Date().toLocaleDateString();
          const lastDownloadDate = localStorage.getItem('lastExcelDownloadDate');

          console.log(`🔔 [SCHEDULER] Time matched! ${hours}:${minutes.toString().padStart(2, '0')}`);
          console.log(`📅 [SCHEDULER] Last download: ${lastDownloadDate}, Today: ${today}`);

          if (lastDownloadDate !== today) {
            console.log(`✅ [SCHEDULER] Starting download NOW!`);
            performAutomaticDownload();
            localStorage.setItem('lastExcelDownloadDate', today);
            lastCheckedMinute = minutes;
          } else {
            console.log(`⚠️ [SCHEDULER] Already downloaded today`);
          }
        }
      } else {
        // Reset when we're past the target minute
        if (minutes !== targetMinutes) {
          lastCheckedMinute = -1;
        }
      }
    };

    // ✅ Check immediately
    checkAndDownload();

    // ✅ Check every 10 seconds (more responsive than 60 seconds)
    const intervalId = setInterval(checkAndDownload, 10000);

    // Store globally so we can clear it later
    if (typeof window !== 'undefined') {
      (window as any).excelDownloadIntervalId = intervalId;
    }

    console.log('✅ [SCHEDULER] Running - checking every 10 seconds');
  };

  const performAutomaticDownload = async () => {
    try {
      console.log('📥 [DOWNLOAD] Starting automatic download...');

      if (!firebase?.getTodayMeals) {
        console.error('❌ Firebase not configured for automatic download');
        return;
      }

      const allMeals = await firebase.getTodayMeals();
      console.log(`📊 [DOWNLOAD] Found ${allMeals.length} meals`);

      if (allMeals.length === 0) {
        console.log('⚠️ No meal data to download');
        return;
      }

      const morningMeals = allMeals.filter((meal: MealRecord) => meal.mealType === 'MORNING');
      const eveningMeals = allMeals.filter((meal: MealRecord) => meal.mealType === 'EVENING');

      // Create workbook (same as manual download)
      const wb = XLSX.utils.book_new();

      // ========== SUMMARY SHEET ==========
      const summaryData = [
        ['MEAL MANAGEMENT REPORT'],
        ['Date:', new Date().toLocaleDateString()],
        [''],
        ['Summary Statistics'],
        ['Morning Meals:', morningMeals.length],
        ['Evening Meals:', eveningMeals.length],
        ['Total Employees Fed:', morningMeals.length + eveningMeals.length],
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // ========== MORNING SHEET ==========
      const morningHeaders = ['Employee ID', 'Counter', 'Time', 'Date'];
      const morningRows = morningMeals.map((meal: MealRecord) => [
        meal.employeeId,
        meal.counterId,
        new Date(meal.timestamp).toLocaleTimeString(),
        meal.date || new Date(meal.timestamp).toLocaleDateString(),
      ]);

      const morningData = [morningHeaders, ...morningRows];
      const morningWs = XLSX.utils.aoa_to_sheet(morningData);
      morningWs['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];

      const morningHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'FFB84D' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      for (let i = 0; i < morningHeaders.length; i++) {
        const cellRef = XLSX.utils.encode_col(i) + '1';
        if (morningWs[cellRef]) {
          morningWs[cellRef].s = morningHeaderStyle;
        }
      }

      XLSX.utils.book_append_sheet(wb, morningWs, 'Morning Meals');

      // ========== EVENING SHEET ==========
      const eveningHeaders = ['Employee ID', 'Counter', 'Time', 'Date'];
      const eveningRows = eveningMeals.map((meal: MealRecord) => [
        meal.employeeId,
        meal.counterId,
        new Date(meal.timestamp).toLocaleTimeString(),
        meal.date || new Date(meal.timestamp).toLocaleDateString(),
      ]);

      const eveningData = [eveningHeaders, ...eveningRows];
      const eveningWs = XLSX.utils.aoa_to_sheet(eveningData);
      eveningWs['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];

      const eveningHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'FF6B35' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      for (let i = 0; i < eveningHeaders.length; i++) {
        const cellRef = XLSX.utils.encode_col(i) + '1';
        if (eveningWs[cellRef]) {
          eveningWs[cellRef].s = eveningHeaderStyle;
        }
      }

      XLSX.utils.book_append_sheet(wb, eveningWs, 'Evening Meals');

      // ========== COMBINED SHEET ==========
      const combinedHeaders = ['Meal Type', 'Employee ID', 'Counter', 'Time', 'Date'];
      const combinedRows = [
        ...morningMeals.map((meal: MealRecord) => [
          'MORNING',
          meal.employeeId,
          meal.counterId,
          new Date(meal.timestamp).toLocaleTimeString(),
          meal.date || new Date(meal.timestamp).toLocaleDateString(),
        ]),
        ...eveningMeals.map((meal: MealRecord) => [
          'EVENING',
          meal.employeeId,
          meal.counterId,
          new Date(meal.timestamp).toLocaleTimeString(),
          meal.date || new Date(meal.timestamp).toLocaleDateString(),
        ]),
      ];

      const combinedData = [combinedHeaders, ...combinedRows];
      const combinedWs = XLSX.utils.aoa_to_sheet(combinedData);
      combinedWs['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];

      const combinedHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '455A64' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      for (let i = 0; i < combinedHeaders.length; i++) {
        const cellRef = XLSX.utils.encode_col(i) + '1';
        if (combinedWs[cellRef]) {
          combinedWs[cellRef].s = combinedHeaderStyle;
        }
      }

      XLSX.utils.book_append_sheet(wb, combinedWs, 'All Meals');

      // ========== DOWNLOAD ==========
      const fileName = `Meal_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      console.log(`✅ [DOWNLOAD] Success: ${fileName}`);
      console.log(`📊 [DOWNLOAD] Morning: ${morningMeals.length} | Evening: ${eveningMeals.length}`);
    } catch (error: any) {
      console.error(`❌ [DOWNLOAD] Error: ${error.message}`);
    }
  };
  //===============================================================

  // =================== PDF ========================

const downloadProfessionalPDF = async () => {
  try {
    setResponse('⏳ Generating Professional PDF Report...');

    if (!firebase?.getTodayMeals) {
      setResponse('❌ Firebase not configured');
      return;
    }

    const allMeals = await firebase.getTodayMeals();

    if (allMeals.length === 0) {
      setResponse('⚠️ No meal data available');
      return;
    }

    const morningMeals = allMeals.filter((meal: MealRecord) => meal.mealType === 'MORNING');
    const eveningMeals = allMeals.filter((meal: MealRecord) => meal.mealType === 'EVENING');

    // Calculate statistics
    const totalEmployees = morningMeals.length + eveningMeals.length;
    const morningPercentage = totalEmployees > 0 ? ((morningMeals.length / totalEmployees) * 100).toFixed(1) : 0;
    const eveningPercentage = totalEmployees > 0 ? ((eveningMeals.length / totalEmployees) * 100).toFixed(1) : 0;

    const counters = new Set<number>();
    allMeals.forEach((meal: MealRecord) => counters.add(meal.counterId));

    const currentDate = new Date();
    const reportDate = currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const reportTime = currentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // ========== CREATE PDF ==========
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Set colors
    const primaryColor = [255, 159, 67] as [number, number, number];
    const secondaryColor = [255, 107, 53] as [number, number, number];
    const accentColor = [69, 90, 100] as [number, number, number];
    const textDark = [44, 62, 80] as [number, number, number];

    let yPosition = 15;

    // ========== HEADER ==========
    doc.setFontSize(24);
    doc.setTextColor(...textDark);
    doc.text('MEAL MANAGEMENT REPORT', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setTextColor(127, 140, 141);
    doc.text('Employee Meal Distribution Analysis', 20, yPosition);
    yPosition += 12;

    doc.setFontSize(9);
    doc.setTextColor(...textDark);
    doc.text(`Report Date: ${reportDate}`, 20, yPosition);
    doc.text(`Generated: ${reportTime}`, 120, yPosition);
    yPosition += 7;
    doc.text(`Report ID: SR-${currentDate.getTime()}`, 20, yPosition);
    doc.text(`Organization: Samosa Man`, 120, yPosition);
    yPosition += 12;

    // Divider line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 8;

    // ========== SUMMARY STATISTICS ==========
    doc.setFontSize(14);
    doc.setTextColor(...textDark);
    doc.text('Summary Statistics', 20, yPosition);
    yPosition += 10;

    const boxWidth = 50;
    const boxHeight = 18;
    const spacing = 5;

    // Morning box
    doc.setFillColor(...primaryColor);
    doc.rect(20, yPosition, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('', 'bold');
    doc.text('🌅 MORNING', 20 + boxWidth / 2, yPosition + 7, { align: 'center' });
    doc.setFont('', 'normal');
    doc.setFontSize(14);
    doc.text(morningMeals.length.toString(), 20 + boxWidth / 2, yPosition + 13, { align: 'center' });

    // Evening box
    doc.setFillColor(...secondaryColor);
    doc.rect(20 + boxWidth + spacing, yPosition, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('', 'bold');
    doc.text('🌆 EVENING', 20 + boxWidth + spacing + boxWidth / 2, yPosition + 7, { align: 'center' });
    doc.setFont('', 'normal');
    doc.setFontSize(14);
    doc.text(eveningMeals.length.toString(), 20 + boxWidth + spacing + boxWidth / 2, yPosition + 13, { align: 'center' });

    // Total box
    doc.setFillColor(...accentColor);
    doc.rect(20 + (boxWidth + spacing) * 2, yPosition, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('', 'bold');
    doc.text('📊 TOTAL', 20 + (boxWidth + spacing) * 2 + boxWidth / 2, yPosition + 7, { align: 'center' });
    doc.setFont('', 'normal');
    doc.setFontSize(14);
    doc.text(totalEmployees.toString(), 20 + (boxWidth + spacing) * 2 + boxWidth / 2, yPosition + 13, { align: 'center' });

    yPosition += boxHeight + 15;

    // Key metrics
    doc.setFontSize(10);
    doc.setTextColor(...textDark);
    doc.text(`Morning: ${morningPercentage}% | Evening: ${eveningPercentage}% | Counters: ${counters.size}`, 20, yPosition);
    yPosition += 12;

    // ========== FUNCTION TO DRAW TABLE ==========
    const drawTable = (
      title: string,
      data: string[][],
      yPos: number,
      headerColor: [number, number, number]
    ): number => {
      const columnWidths = [40, 30, 35, 40];
      const rowHeight = 8;
      const tableStartX = 20;

      // Title
      doc.setFontSize(12);
      doc.setTextColor(...textDark);
      doc.text(title, tableStartX, yPos);
      yPos += 8;

      // Header row
      doc.setFillColor(...headerColor);
      doc.setTextColor(255, 255, 255);
      doc.setFont('', 'bold');
      doc.setFontSize(9);

      let xPos = tableStartX;
      const headers = ['Employee ID', 'Counter', 'Time', 'Date'];
      headers.forEach((header: string, index: number) => {
        doc.text(header, xPos + 2, yPos + 5);
        xPos += columnWidths[index];
      });

      yPos += rowHeight;

      // Data rows
      doc.setTextColor(...textDark);
      doc.setFont('', 'normal');
      doc.setFontSize(8);

      data.forEach((row, rowIndex) => {
        // Alternate row colors
        if (rowIndex % 2 === 1) {
          doc.setFillColor(248, 249, 250);
          doc.rect(tableStartX, yPos, 145, rowHeight, 'F');
        }

        xPos = tableStartX;
        row.forEach((cell : string, cellIndex : number) => {
          doc.text(cell, xPos + 2, yPos + 5);
          xPos += columnWidths[cellIndex];
        });

        yPos += rowHeight;
      });

      // Table border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(tableStartX, yPos - (data.length + 1) * rowHeight, 145, (data.length + 1) * rowHeight);

      return yPos + 5;
    };

    // ========== MORNING TABLE ==========
    const morningTableData = morningMeals.map((meal: MealRecord) => [
      meal.employeeId,
      `Counter ${meal.counterId}`,
      new Date(meal.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      new Date(meal.timestamp).toLocaleDateString('en-US'),
    ]);

    yPosition = drawTable('🌅 Morning Meal Distribution', morningTableData, yPosition, primaryColor);
    yPosition += 5;

    // Check if we need a new page
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    // ========== EVENING TABLE ==========
    const eveningTableData = eveningMeals.map((meal: MealRecord) => [
      meal.employeeId,
      `Counter ${meal.counterId}`,
      new Date(meal.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      new Date(meal.timestamp).toLocaleDateString('en-US'),
    ]);

    if (eveningTableData.length > 0) {
      yPosition = drawTable('🌆 Evening Meal Distribution', eveningTableData, yPosition, secondaryColor);
      yPosition += 5;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(127, 140, 141);
      doc.text('🌆 Evening Meal Distribution - No records', 20, yPosition);
      yPosition += 10;
    }

    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // ========== COMBINED TABLE ==========
    const combinedTableData = allMeals.map((meal: MealRecord) => [
      meal.mealType === 'MORNING' ? 'MORNING' : 'EVENING',
      meal.employeeId,
      `Counter ${meal.counterId}`,
      new Date(meal.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      new Date(meal.timestamp).toLocaleDateString('en-US'),
    ]);

    // Custom table for combined (5 columns)
    doc.setFontSize(12);
    doc.setTextColor(...textDark);
    doc.text('📋 Complete Daily Report', 20, yPosition);
    yPosition += 8;

    const columnWidths = [30, 35, 30, 35, 40];
    const rowHeight = 7;
    const tableStartX = 20;

    // Header
    doc.setFillColor(...accentColor);
    doc.setTextColor(255, 255, 255);
    doc.setFont('', 'bold');
    doc.setFontSize(8);

    let xPos = tableStartX;
    const combinedHeaders = ['Shift', 'Employee', 'Counter', 'Time', 'Date'];
    combinedHeaders.forEach((header : string , index : number) => {
      doc.text(header, xPos + 1, yPosition + 4);
      xPos += columnWidths[index];
    });

    yPosition += rowHeight;

    // Data rows
    doc.setTextColor(...textDark);
    doc.setFont('', 'normal');
    doc.setFontSize(7);

    combinedTableData.forEach((row: string[], rowIndex: number) => {
      if (rowIndex % 2 === 1) {
        doc.setFillColor(248, 249, 250);
        doc.rect(tableStartX, yPosition, 170, rowHeight, 'F');
      }

      xPos = tableStartX;
      row.forEach((cell: string, cellIndex: number) => {
        doc.text(cell, xPos + 1, yPosition + 4);
        xPos += columnWidths[cellIndex];
      });

      yPosition += rowHeight;
    });

    // Border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(tableStartX, yPosition - (combinedTableData.length + 1) * rowHeight, 170, (combinedTableData.length + 1) * rowHeight);

    // ========== FOOTER PAGE ==========
    doc.addPage();

    let footerY = 40;

    doc.setFontSize(16);
    doc.setTextColor(...textDark);
    doc.text('Report Summary', 20, footerY);
    footerY += 12;

    doc.setLineWidth(0.5);
    doc.setDrawColor(...primaryColor);
    doc.line(20, footerY, 190, footerY);
    footerY += 10;

    // Summary content
    doc.setFontSize(10);
    doc.setTextColor(...textDark);
    doc.text('This is an automatically generated meal distribution report', 20, footerY);
    footerY += 6;
    doc.text('from the Samosa Man Management System.', 20, footerY);
    footerY += 10;

    doc.setFontSize(9);
    doc.setTextColor(127, 140, 141);
    doc.text(`Generated: ${reportDate} at ${reportTime}`, 20, footerY);
    footerY += 8;

    const statsLine = `Total: ${totalEmployees} | Morning: ${morningMeals.length} (${morningPercentage}%) | Evening: ${eveningMeals.length} (${eveningPercentage}%) | Counters: ${counters.size}`;
    doc.text(statsLine, 20, footerY);
    footerY += 12;

    // Company info
    doc.setFontSize(11);
    doc.setTextColor(...textDark);
    doc.setFont('', 'bold');
    doc.text('Samosa Man', 20, footerY);
    footerY += 8;

    doc.setFontSize(9);
    doc.setFont('', 'normal');
    doc.setTextColor(127, 140, 141);
    doc.text('Employee Meal Management System', 20, footerY);
    footerY += 5;
    doc.text('www.ssamosaman.com', 20, footerY);
    footerY += 10;

    // Confidentiality notice
    doc.setFontSize(8);
    doc.setTextColor(189, 195, 199);
    doc.text(
      '© 2026 Samosa Man. Confidential - For authorized personnel only.',
      20,
      footerY,
    );

    // ========== SAVE PDF ==========
    const fileName = `Meal_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
    doc.save(fileName);

    setResponse(`✅ Professional PDF Report downloaded!\nFile: ${fileName}`);
    console.log('✅ PDF generated:', fileName);

  } catch (error: any) {
    console.error('❌ PDF Error:', error);
    setResponse(`❌ Error: ${error.message || 'Failed to generate PDF'}`);
  }
};




  const handleManualSync = async () => {
    await loadTodayMeals();
    setResponse('✅ Data refreshed successfully!');
  };

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #fff8f0 0%, #ffe8d6 50%, #ffeaa7 100%)' }}>
        <div style={{ textAlign: 'center', color: '#ff9f43' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'bounce 1s infinite' }}>⏳</div>
          <p style={{ fontSize: '1.2rem', fontWeight: '500', color: '#1a202c' }}>Loading your meal management system...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff8f0 0%, #ffe8d6 50%, #ffeaa7 100%)', padding: '2rem', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(15px); }
        }

        input, select {
          font-family: 'Segoe UI', sans-serif;
        }

        button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(255, 159, 67, 0.2);
        }

        button:active:not(:disabled) {
          transform: translateY(0);
        }

        input:focus, select:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 159, 67, 0.1);
          border-color: #ff9f43;
        }

        table {
          font-size: 0.95rem;
          letter-spacing: 0.3px;
        }

        tbody tr {
          transition: background-color 0.2s ease;
        }

        tbody tr:hover {
          background-color: rgba(255, 159, 67, 0.08);
        }

        @media (max-width: 1024px) {
          .grid-2 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Animated background elements - same as login/signup */}
      <div style={{ position: 'fixed', top: '-40%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(255, 107, 107, 0.08)', animation: 'float 20s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-30%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255, 165, 0, 0.1)', animation: 'float 25s ease-in-out infinite reverse', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem', textAlign: 'center', animation: 'slideInUp 0.6s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '0 0 0.5rem 0' }}>
            <span style={{ fontSize: '2.8rem' }}>🍲</span>
            <h1 style={{ fontSize: '2.8rem', color: '#1a202c', margin: 0, fontWeight: '700', letterSpacing: '-0.5px', textShadow: '0 2px 4px rgba(255, 159, 67, 0.2)' }}>
              Samosa Man
            </h1>
            <span style={{ fontSize: '2.8rem' }}>🌶️</span>
          </div>
          <p style={{ fontSize: '1.1rem', color: '#1a202c', fontWeight: '600', marginBottom: '0.5rem' }}>
            Employee Meal Management System
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff9f43', fontWeight: '600', background: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem 1.5rem', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
              <span>⏱️</span> Last sync: {lastSync}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff9f43', fontWeight: '600', background: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem 1.5rem', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
              <span>📦</span> {archiveStatus}
            </div>
          </div>
        </div>

        {/* Firebase Warning */}
        {!firebase && (
          <div style={{ background: 'rgba(255, 193, 7, 0.15)', border: '2px solid #ffc107', borderRadius: '12px', padding: '1rem', marginBottom: '2rem', color: '#856404', animation: 'slideInUp 0.4s ease-out' }}>
            <strong>⚠️ Firebase Configuration Required</strong>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              Firebase is not properly configured. Please ensure your <code>@/lib/firebase</code> module is set up correctly with all required functions.
            </p>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Left Column - Form */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 20px 100px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            backdropFilter: 'blur(10px)',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 30px 80px rgba(255, 159, 67, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 20px 100px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.8rem' }}>📝</span>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#1a202c', fontWeight: '700' }}>Provide Meal</h2>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.7rem', fontWeight: '600', color: '#2d3748', fontSize: '0.95rem', letterSpacing: '0.3px' }}>
                Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="e.g., EMP001"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  letterSpacing: '0.5px',
                  backgroundColor: '#f7fafc',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.7rem', fontWeight: '600', color: '#2d3748', fontSize: '0.95rem', letterSpacing: '0.3px' }}>
                Meal Type
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as 'MORNING' | 'EVENING')}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  backgroundColor: '#f7fafc',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff9f43' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.2em',
                  paddingRight: '2.5rem',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                }}
              >
                <option value="MORNING">🌅 Morning</option>
                <option value="EVENING">🌆 Evening</option>
              </select>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.7rem', fontWeight: '600', color: '#2d3748', fontSize: '0.95rem', letterSpacing: '0.3px' }}>
                Counter
              </label>
              <select
                value={counterId}
                onChange={(e) => setCounterId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  backgroundColor: '#f7fafc',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff9f43' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.2em',
                  paddingRight: '2.5rem',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                }}
              >
                <option value={1}>Counter 1 (Morning)</option>
                <option value={2}>Counter 2 (Evening)</option>
                <option value={3}>Counter 3 (Evening)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <button
                onClick={handleProvideMeal}
                disabled={loading || !firebase}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: loading || !firebase ? '#cbd5e0' : 'linear-gradient(135deg, #ff9f43 0%, #ee5a2f 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: loading || !firebase ? 'not-allowed' : 'pointer',
                  opacity: loading || !firebase ? 0.7 : 1,
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loading && firebase) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 159, 67, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && firebase) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {loading ? '⏳ Processing...' : '✅ Provide Meal'}
              </button>

              <button
                onClick={handleCheckEligibility}
                disabled={loading || !firebase}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: !firebase ? '#cbd5e0' : 'linear-gradient(135deg, #ffa502 0%, #ff6b35 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: !firebase ? 'not-allowed' : 'pointer',
                  opacity: !firebase ? 0.7 : 1,
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loading && firebase) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 159, 67, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && firebase) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                🔍 Check Eligibility
              </button>

              <button
                onClick={handleManualSync}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #f4a261 0%, #e76f51 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 159, 67, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🔄 Manual Sync
              </button>


              <button
                onClick={downloadExcel}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #56de8fff 0%, #229954 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(39, 174, 96, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                📥 Download Excel Report
              </button>

              <button
                onClick={downloadProfessionalPDF}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(231, 76, 60, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                📄 Download Professional PDF Report
              </button>


              {/* Settings Button */}
              <button
                onClick={() => setShowScheduleSettings(!showScheduleSettings)}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #6C63FF 0%, #5A4CB8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(108, 99, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                ⚙️ Schedule Settings
              </button>

            </div>
          </div>

          {/* Right Column - Response */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 20px 100px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            backdropFilter: 'blur(10px)',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 30px 80px rgba(255, 159, 67, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 20px 100px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.8rem' }}>📢</span>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#1a202c', fontWeight: '700' }}>Response</h2>
            </div>
            <div
              style={{
                flex: 1,
                padding: '1.5rem',
                backgroundColor: '#f7fafc',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontFamily: "'Courier New', monospace",
                fontSize: '0.9rem',
                lineHeight: '1.7',
                overflowY: 'auto',
                minHeight: '200px',
                color: '#2d3748',
              }}
            >
              {response ? (
                <span style={{ fontWeight: '900', letterSpacing: '0.3px' }}>{response}</span>
              ) : (
                <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>System responses will appear here...</span>
              )}
            </div>
          </div>
        </div>


        {/* Schedule Settings Modal */}
        {showScheduleSettings ? (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                maxWidth: '400px',
                width: '90%',
              }}
            >
              <h3
                style={{
                  fontSize: '1.5rem',
                  color: '#1a202c',
                  marginBottom: '1.5rem',
                }}
              >
                ⚙️ Automatic Download Schedule
              </h3>

              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.7rem',
                    fontWeight: '600',
                    color: '#2d3748',
                  }}
                >
                  Enable Automatic Download:
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={autoDownloadEnabled}
                    onChange={(e) => {
                      setAutoDownloadEnabled(e.target.checked);
                      if (typeof localStorage !== 'undefined') {
                        localStorage.setItem(
                          'excelAutoDownloadEnabled',
                          String(e.target.checked)
                        );
                      }
                      if (e.target.checked) {
                        scheduleAutomaticDownload();
                      }
                    }}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#2d3748' }}>
                    {autoDownloadEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </label>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.7rem',
                    fontWeight: '600',
                    color: '#2d3748',
                  }}
                >
                  Download Time (24-hour format):
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => {
                    setScheduledTime(e.target.value);
                    if (typeof localStorage !== 'undefined') {
                      localStorage.setItem('excelDownloadTime', e.target.value);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#a0aec0',
                    marginTop: '0.5rem',
                  }}
                >
                  Current time:{' '}
                  {new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setShowScheduleSettings(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#e2e8f0',
                    color: '#2d3748',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                {/* <button
                  onClick={() => {
                    setShowScheduleSettings(false);
                    scheduleAutomaticDownload();
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #27AE60 0%, #229954 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Save & Apply
                </button> */}

                <button
                  onClick={() => {
                    // Save to localStorage
                    if (typeof localStorage !== 'undefined') {
                      localStorage.setItem('excelDownloadTime', scheduledTime);
                      localStorage.setItem('excelAutoDownloadEnabled', String(autoDownloadEnabled));
                    }

                    console.log('💾 [SETTINGS] Saved:', { scheduledTime, autoDownloadEnabled });

                    // ✅ CLEAR OLD INTERVAL
                    if (typeof window !== 'undefined' && (window as any).excelDownloadIntervalId) {
                      clearInterval((window as any).excelDownloadIntervalId);
                      console.log('🛑 [SCHEDULER] Stopped old scheduler');
                    }

                    setShowScheduleSettings(false);

                    // ✅ RESTART SCHEDULER WITH NEW SETTINGS
                    console.log('🔄 [SCHEDULER] Restarting with new settings...');
                    scheduleAutomaticDownload();
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #27AE60 0%, #229954 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Save & Apply
                </button>
              </div>
            </div>s
          </div>
        ) : null}

        {/* NEW: Meal Count Statistics Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 159, 67, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '2px solid rgba(255, 159, 67, 0.3)',
          boxShadow: '0 20px 100px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <span style={{ fontSize: '2rem' }}>📊</span>
            <h2 style={{ fontSize: '1.8rem', margin: 0, color: '#1a202c', fontWeight: '700' }}>
              Today's Meal Count
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
          }}>
            {/* Morning Count Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '2px solid #ffd89b',
              boxShadow: '0 8px 24px rgba(255, 159, 67, 0.15)',
              textAlign: 'center',
              transition: 'all 0.3s ease',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 159, 67, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 159, 67, 0.15)';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌅</div>
              <p style={{ fontSize: '0.9rem', color: '#a0aec0', margin: '0 0 0.5rem 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Morning Meals
              </p>
              <p style={{
                fontSize: '2.8rem',
                color: '#ff9f43',
                margin: 0,
                fontWeight: '700',
                letterSpacing: '-1px',
              }}>
                {morningCount}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e0', margin: '0.5rem 0 0 0' }}>
                Employees
              </p>
            </div>

            {/* Evening Count Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '2px solid #ffd89b',
              boxShadow: '0 8px 24px rgba(255, 159, 67, 0.15)',
              textAlign: 'center',
              transition: 'all 0.3s ease',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 159, 67, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 159, 67, 0.15)';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌆</div>
              <p style={{ fontSize: '0.9rem', color: '#a0aec0', margin: '0 0 0.5rem 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Evening Meals
              </p>
              <p style={{
                fontSize: '2.8rem',
                color: '#ff9f43',
                margin: 0,
                fontWeight: '700',
                letterSpacing: '-1px',
              }}>
                {eveningCount}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e0', margin: '0.5rem 0 0 0' }}>
                Employees
              </p>
            </div>

            {/* Total Count Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 159, 67, 0.2) 0%, rgba(255, 165, 0, 0.15) 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '2px solid #ff9f43',
              boxShadow: '0 8px 24px rgba(255, 159, 67, 0.25)',
              textAlign: 'center',
              transition: 'all 0.3s ease',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 159, 67, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 159, 67, 0.25)';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📈</div>
              <p style={{ fontSize: '0.9rem', color: '#a0aec0', margin: '0 0 0.5rem 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Today
              </p>
              <p style={{
                fontSize: '2.8rem',
                color: '#ff9f43',
                margin: 0,
                fontWeight: '700',
                letterSpacing: '-1px',
              }}>
                {totalCount}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e0', margin: '0.5rem 0 0 0' }}>
                Employees
              </p>
            </div>
          </div>
        </div>

        {/* Today's Meals Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 20px 100px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          marginBottom: '2rem',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          backdropFilter: 'blur(10px)',
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 30px 80px rgba(255, 159, 67, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 100px rgba(0, 0, 0, 0.1)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.8rem' }}>📊</span>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#1a202c', fontWeight: '700' }}>Today's Meals</h2>
                <p style={{ fontSize: '0.85rem', color: '#a0aec0', margin: '0.25rem 0 0 0', fontWeight: '500' }}>Active Collection Only</p>
              </div>
            </div>
            <button
              onClick={() => setShowTodayMeals(!showTodayMeals)}
              style={{
                padding: '0.75rem 1.5rem',
                background: showTodayMeals ? 'linear-gradient(135deg, #ffa502 0%, #ff6b35 100%)' : 'linear-gradient(135deg, #ff9f43 0%, #ee5a2f 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 159, 67, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {showTodayMeals ? '🔼 Hide' : '🔽 Show'} Meals ({todayMeals.length})
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#ff9f43', fontWeight: '600', marginBottom: '1.5rem', letterSpacing: '0.5px' }}>
            ⚡ Real-time - Yesterday archived at midnight
          </p>

          {showTodayMeals && (
            <>
              {todayMeals.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Employee ID</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Meal Type</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Counter</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayMeals.map((record, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '1rem', fontWeight: '600', color: '#ff9f43' }}>{record.employeeId}</td>
                          <td style={{ padding: '1rem', color: '#2d3748' }}>
                            {record.mealType === 'MORNING' ? '🌅 Morning' : '🌆 Evening'}
                          </td>
                          <td style={{ padding: '1rem', color: '#2d3748' }}>Counter {record.counterId}</td>
                          <td style={{ padding: '1rem', color: '#2d3748', fontSize: '0.9rem' }}>
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0' }}>
                  <p style={{ fontSize: '1rem', fontWeight: '500' }}>No meals recorded today yet</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Employee History Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 20px 100px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          backdropFilter: 'blur(10px)',
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 30px 80px rgba(255, 159, 67, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 100px rgba(0, 0, 0, 0.1)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>📋</span>
            <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#1a202c', fontWeight: '700' }}>Employee History</h2>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '1.5rem', fontWeight: '500' }}>From Archive</p>

          <button
            onClick={() => fetchHistory()}
            disabled={!employeeId.trim() || !firebase}
            style={{
              padding: '0.875rem 1.5rem',
              marginBottom: '1.5rem',
              background: employeeId.trim() && firebase ? 'linear-gradient(135deg, #ff9f43 0%, #ee5a2f 100%)' : '#cbd5e0',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: employeeId.trim() && firebase ? 'pointer' : 'not-allowed',
              opacity: employeeId.trim() && firebase ? 1 : 0.7,
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              if (employeeId.trim() && firebase) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 159, 67, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (employeeId.trim() && firebase) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            📖 Fetch History for {employeeId || 'Employee'}
          </button>

          {history.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Meal Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Counter</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#ff9f43' }}>{record.date}</td>
                      <td style={{ padding: '1rem', color: '#2d3748' }}>
                        {record.mealType === 'MORNING' ? '🌅 Morning' : '🌆 Evening'}
                      </td>
                      <td style={{ padding: '1rem', color: '#2d3748' }}>Counter {record.counterId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0' }}>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>
                {employeeId.trim() ? `No history found for ${employeeId}` : 'Enter an employee ID to view history'}
              </p>
            </div>
          )}
        </div>
      </div>
      <div style={{
        textAlign: 'center',
        marginTop: '3rem',
        padding: '1.5rem',
        color: '#4c617dff',
        fontSize: '0.9rem',
        fontWeight: '500',
        letterSpacing: '0.5px',
        borderTop: '1px solid rgba(255, 255, 255, 0.3)',
        animation: 'slideInUp 0.6s ease-out',
      }}>
        <h2> Crafted with ❤️ by <span style={{ color: '#000000ff', fontWeight: '600' }}>Krishna Tulaskar</span> </h2>
      </div>

    </div>
  );
}