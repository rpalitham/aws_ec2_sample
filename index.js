const aws = require("aws-sdk");
const NodeRSA = require("node-rsa");

/**
 * @file
 * This will create an instance in aws ec2.
 * Allocate Elastic Ip to this account.
 * Associate public static Ip to the created Instance.
 * Wait for the instance running and generate administrator random passowrd using keypair we assigned while creating Instance.
 */
(async function () {
  try {
    aws.config.setPromisesDependency();

    aws.config.update({
      accessKeyId: "--------- access key Id ---------",
      secretAccessKey: "---------- secret access key ----------",
      region: "us-east-1",
    });

    let ec2 = new aws.EC2({ apiVersion: "2016-11-15" });

    let pvtKey = "----- private key -----";
    let KeyName = "----- keypair name ------  ";
    let instance_id = "";
    let admin_password = "";
    let public_ip = "";

    let instanceParams = {
      ImageId: "------ image id --------", // Base image Id ( windows server 2019 );
      InstanceType: "t2.micro",
      KeyName: KeyName, // Key pair name to generate Administrator password
      MinCount: 1,
      MaxCount: 1,
    };

    // creating an instance.
    let data = await ec2.runInstances(instanceParams).promise();
    instance_id = data.Instances[0].InstanceId;

    // Allocating elastic ip to the account.
    let elastic_ip = await this.ec2.allocateAddress().promise();
    if (elastic_ip) {
      public_ip = elastic_ip.PublicIp;
    }

    let waitParams = {
      InstanceIds: [instance_id],
    };
    // Waiting for instance to running state and assign public static Ip to the instance.
    this.ec2.waitFor("instanceRunning", waitParams, (err, data) => {
      if (err) {
        console.log(err, err.stack);
        throw error;
      } // an error occurred
      else {
        let elastic_ip_allocation_params = {
          AllocationId: elastic_ip.AllocationId,
          InstanceId: instance_id,
        };
        this.ec2.associateAddress(elastic_ip_allocation_params).promise();
      }
    });

    // let allocationId = "";
    // let params = {
    //   Filters: [
    //     {
    //       Name: "instance-id",
    //       Values: [instance_id],
    //     },
    //   ],
    // };

    // let { Addresses } = await this.ec2.describeAddresses(params).promise();
    // if( Addresses && Addresses.length > 0) {
    //     allocationId = Addresses[0].AllocationId
    // }

    // await this.ec2.releaseAddress({AllocationId : allocationId}).promise();

    let key_private = new NodeRSA();
    key_private.importKey(pvtKey);
    key_private.setOptions({ encryptionScheme: "pkcs1" });

    // Waiting for the instance to get the password data available and decrypting password using assigned private key.
    let encrypted_data = await ec2
      .waitFor("passwordDataAvailable", { InstanceId: instance_id })
      .promise();
    if (encrypted_data.PasswordData) {
      admin_password = key_private.decrypt(encrypted_data.PasswordData, "utf8");
    }

    console.log("===============>", admin_password);
    console.log("===============>", instance_id);
    console.log("===============>", public_ip);
  } catch (e) {
    console.log("error while creating instance", e);
  }
})();
