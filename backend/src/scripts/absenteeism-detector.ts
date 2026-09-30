import dotenv from 'dotenv';
import { absenteeismService } from '../services/absenteeism.service';

dotenv.config();

async function run() {
  const targetDate = process.argv[2] || new Date().toISOString().slice(0, 10);
  console.log(`[Absenteeism Detection Engine] Executing analysis for date: ${targetDate}`);

  try {
    const result = await absenteeismService.detectAbsences(targetDate, 'CLI Automated Cron/Script');
    console.log('-------------------------------------------------------');
    console.log(`Evaluated Active Employees: ${result.evaluatedCount}`);
    console.log(`Previously Logged Absences: ${result.existingAbsencesCount}`);
    console.log(`New Potential Absences Flagged: ${result.newAbsencesFlagged.length}`);

    if (result.newAbsencesFlagged.length > 0) {
      console.log('Flagged Details:');
      result.newAbsencesFlagged.forEach(item => {
        console.log(` - [${item.empId}] ${item.employeeName} (${item.department}): ${item.reason}`);
      });
    } else {
      console.log('All scheduled employees accounted for (Present, Late, or on Approved Leave).');
    }
    console.log('-------------------------------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Absenteeism detection script encountered an error:', err);
    process.exit(1);
  }
}

run();
