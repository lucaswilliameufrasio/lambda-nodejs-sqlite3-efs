resource "aws_sqs_queue" "write_dlq" {
  name                      = "${local.prefix}-write-dlq.fifo"
  fifo_queue                = true
  message_retention_seconds = 1209600

  tags = local.tags
}

resource "aws_sqs_queue" "write" {
  name                      = "${local.prefix}-write-queue.fifo"
  fifo_queue                = true
  fifo_throughput_limit     = "perMessageGroupId"
  deduplication_scope       = "messageGroup"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 345600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.write_dlq.arn
    maxReceiveCount     = 3
  })

  tags = local.tags
}
