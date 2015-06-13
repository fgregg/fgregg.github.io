      // Load the Visualization API and the piechart package.
      google.load('visualization', '1', {'packages':['table']});
      
      // Set a callback to run when the API is loaded.
      google.setOnLoadCallback(drawTable);
      
      // Callback that creates and populates a data table, 
      // instantiates the table, passes in the data and
      // draws it.
      function drawTable() 
        {
         var query = new google.visualization.Query(
         
'http://spreadsheets.google.com/pub?key=rlIRRLTAk8mCEnI_qzjQB6w&headers=1');
  
         // Send the query with a callback function.
         query.send(handleQueryResponse);
        }

      function handleQueryResponse(response) 
        {
         if (response.isError()) 
           {
            alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
            return;
           }

         var data = response.getDataTable();
         Table = new google.visualization.Table(document.getElementById('gs_table'));
         Table.draw(data, {width: '33em', allowHtml : true});
        }


  
