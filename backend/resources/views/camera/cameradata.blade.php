<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

<body>


    <table id="tablecontent">

        <tr>
            <td> IpAddr :</td>
            <td>{{ $data['IpAddr']}} </td>


        </tr>
        <tr>
            <td> MACAddress :</td>
            <td>{{ $data['MACAddress']}} </td>


        </tr>
        <tr>
            <td> DeviceID :</td>
            <td>{{ $data['DeviceID']}} </td>


        </tr>
        <tr>
            <td> FaceID :</td>
            <td>{{ $data['Face_0']['FaceID']}} </td>


        </tr>
        <tr>
            <td> Age :</td>
            <td>{{ $data['Face_0']['Age']}} </td>


        </tr>

        <tr>
            <td> Glass :</td>
            <td>{{ $data['Face_0']['Glass']}} </td>


        </tr>
        <tr>
            <td> Beard :</td>
            <td>{{ $data['Face_0']['Beard']}} </td>


        </tr>
        <tr>
            <td> Hair :</td>
            <td>{{ $data['Face_0']['Hair']}} </td>


        </tr>
        <tr>
            <td> Hair :</td>
            <td>{{ $data['Face_0']['Hair']}} </td>


        </tr>
        <tr>
            <td> Gender :</td>
            <td>{{ $data['Face_0']['Gender']}} </td>


        </tr>
        <tr>
            <td> IsRegistered :</td>
            <td>{{ $data['Face_0']['IsRegistered']}} </td>


        </tr>
        <tr>
            <td> Time :</td>
            <td>{{ $data['Face_0']['Time']}} </td>


        </tr>
        <tr>
            <td> SnapshotNum :</td>
            <td>{{ $data['Face_0']['SnapshotNum']}} </td>


        </tr>
        <tr>
            <td> FaceSnapFile :</td>
            <td>{{ $data['Face_0']['FaceSnapFile']}} </td>


        </tr>
        <tr>
            <td> Snapshot :</td>
            <td><img src="data:image/jpeg;base64,{{ $data['Face_0']['Snapshot']}}" style="width:100px;height:100px" /> </td>


        </tr>
        @php
        $FullSnapshot='';
        if(isset($data['Face_0']['FullSnapshot']) )
        {
        $FullSnapshot=$data['Face_0']['FullSnapshot'] ?$data['Face_0']['FullSnapshot'] :'';
        }

        @endphp
        <tr>
            <td> FullSnapshot :</td>
            <td><img src="data:image/jpeg;base64,{{ $FullSnapshot}}" style="width:100px;height:100px" /> </td>


        </tr>


    </table>

    <style>
        td {
            border: 1px solid #DDD;
        }
    </style>

</body>

</html>