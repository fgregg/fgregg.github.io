    
      // Load the Visualization API and the piechart package.
      google.load('visualization', '1', {'packages':['table']});
      
      // Set a callback to run when the API is loaded.
      google.setOnLoadCallback(drawViscosityTable);
      
      // Callback that creates and populates a data table, 
      // instantiates the table, passes in the data and
      // draws it.
      function drawViscosityTable() 
        {
         var query = new google.visualization.Query(
         'http://spreadsheets.google.com/pub?key=r1rXnD75zsPlvQOcS0j6Kgg');
  
         // Send the query with a callback function.
         query.send(handleQueryResponseVisc);
        }

      function handleQueryResponseVisc(response) 
        {
         if (response.isError()) 
           {
            alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
            return;
           }

         var data = response.getDataTable();
         viscosityTable = new google.visualization.Table(document.getElementById('viscosity_table'));
         viscosityTable.draw(data, {width: '33em', height: '25em', allowHtml : true});
        }


function drawViscChart() {
  var query = new google.visualization.Query(
      'http://spreadsheets.google.com/tq?key=r1rXnD75zsPlvQOcS0j6Kgg&range=A1:M15&gid=3');
  
 
  
}
