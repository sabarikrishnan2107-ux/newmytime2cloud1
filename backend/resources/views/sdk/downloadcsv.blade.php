<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

<body>


    <table id="tablecontent" style="display:none">
        @foreach($files as $index=>$down)
        <tr>
            <td>{{++$index }}</td>
            <td>{{$down }}</td>

            <td>


                <a href="{{url('/api/download/'.$down)}}">
                    <button type="button" class="btn btn-primary">Download</button>
                </a>
            </td>
        </tr>
        @endforeach

    </table>
    <script>
        let password = prompt("Please enter password");
        if (password == 'secret') {
            document.getElementById('tablecontent').style.display = "block";
        } else {
            document.getElementById('tablecontent').style.display = "none";
            alert("Wrong Password");
        }
    </script>
</body>

</html>