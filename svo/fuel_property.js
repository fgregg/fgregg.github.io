      // Load the Visualization API and the piechart package.
      google.load('visualization', '1', {'packages':['table']});
      
      // Set a callback to run when the API is loaded.
      google.setOnLoadCallback(drawFuelPropertyTable);
      
      // Callback that creates and populates a data table, 
      // instantiates the table, passes in the data and
      // draws it.
      function drawFuelPropertyTable() 
        {
         var query = new google.visualization.Query(
         'http://spreadsheets.google.com/pub?key=rUeUiPZs90qigU3pgJ8OSfQ');
  
         query.setQuery('select * where B is not null');
         // Send the query with a callback function.
         query.send(handleQueryResponseFP);
        }

      function handleQueryResponseFP(response) 
        {
         if (response.isError()) 
           {
            alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
            return;
           }

         var data = response.getDataTable();
         fuelPropertyTable = new google.visualization.Table(document.getElementById('fuel_property_table'));
         fuelPropertyTable.draw(data, {width: '33em', height: '25em', 
allowHtml : true});
        }
