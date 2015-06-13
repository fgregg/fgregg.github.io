      // Load the Visualization API and the piechart package.
      google.load('visualization', '1', {'packages':['table']});
      
      // Set a callback to run when the API is loaded.
      google.setOnLoadCallback(drawFattyAcidTable);
      
      // Callback that creates and populates a data table, 
      // instantiates the table, passes in the data and
      // draws it.
      function drawFattyAcidTable() 
        {
         var query = new google.visualization.Query(
         'http://spreadsheets.google.com/pub?key=rWlXuVc-gNrfATR2MTWV_xw');
  

         query.setQuery('select * where J is not null');
         // Send the query with a callback function.
         query.send(handleQueryResponseFA);
        }

      function handleQueryResponseFA(response) 
        {
         if (response.isError()) 
           {
            alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
            return;
           }

         var data = response.getDataTable();
         fattyAcidTable = new google.visualization.Table(document.getElementById('fatty_acid_table'));
         fattyAcidTable.draw(data, {width: '33em', height: '25em', allowHtml : true});
        }
