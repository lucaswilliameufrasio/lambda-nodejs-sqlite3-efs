data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/../lambda.zip"

  source {
    content  = "#!/bin/bash\nnode /var/task/dist/index.js"
    filename = "run.sh"
  }
}

resource "aws_lambda_function" "api" {
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256
  function_name    = "${local.prefix}-${local.app_name}"
  role             = aws_iam_role.lambda.arn
  handler          = "run.sh"
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  timeout          = 30
  memory_size      = 256
  publish          = true

  layers = [
    "arn:aws:lambda:${data.aws_region.current.region}:753240598075:layer:LambdaAdapterLayerArm64:28",
  ]

  environment {
    variables = {
      AWS_LAMBDA_EXEC_WRAPPER     = "/opt/bootstrap"
      AWS_LWA_PASS_THROUGH_PATH   = "/events"
      AWS_LWA_ASYNC_INIT          = "true"
      DATABASE_PATH               = "/mnt/volume/users.db"
      SQS_QUEUE_URL               = aws_sqs_queue.write.url
      NODE_ENV                    = "production"
    }
  }

  file_system_config {
    arn              = aws_efs_access_point.app.arn
    local_mount_path = "/mnt/volume"
  }

  vpc_config {
    subnet_ids         = data.aws_subnets.default.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  depends_on = [
    aws_efs_mount_target.main,
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_vpc_access,
  ]

  lifecycle {
    ignore_changes = [
      source_code_hash,
    ]
  }

  tags = local.tags
}

resource "aws_lambda_event_source_mapping" "sqs_write" {
  event_source_arn = aws_sqs_queue.write.arn
  function_name    = aws_lambda_function.api.arn
  batch_size       = 1
  enabled          = true
}

data "aws_region" "current" {}
