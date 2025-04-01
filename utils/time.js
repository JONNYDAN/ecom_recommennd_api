
function getCurrentWeek() {
    const currentDate = new Date();
  
    // Get the current day of the week (0-6), Sunday is 0, Monday is 1, etc.
    const currentDay = currentDate.getDay();
  
    // Calculate the distance from the current day to the start of the week (Monday)
    const distanceToMonday = (currentDay + 6) % 7;
  
    // Calculate the start and end dates of the week
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - distanceToMonday);
  
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
  
    // Format the dates as needed (optional)
   
    return {
      startDate: startDate.setHours(0, 0, 0, 0),
      endDate:endDate.setHours(23, 59, 59, 0),
    };
}
 
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

module.exports = {
    getCurrentWeek,
};